import os
import json
import urllib.request
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    """Добавление тайтла: импорт из TMDB по tmdb_id или ручная форма."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    schema = os.environ['MAIN_DB_SCHEMA']
    tmdb_key = os.environ.get('TMDB_API_KEY', '')

    # Режим: import_tmdb или manual
    mode = body.get('mode', 'manual')

    if mode == 'import_tmdb':
        tmdb_id = body.get('tmdb_id')
        media_type = body.get('type', 'movie')  # 'movie' or 'series'
        if not tmdb_id or not tmdb_key:
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нужен tmdb_id и TMDB_API_KEY'})}

        endpoint = 'movie' if media_type == 'movie' else 'tv'
        url = f'https://api.themoviedb.org/3/{endpoint}/{tmdb_id}?api_key={tmdb_key}&language=ru-RU&append_to_response=credits,episodes'
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            d = json.loads(resp.read().decode())

        title = d.get('title') or d.get('name', '')
        original_title = d.get('original_title') or d.get('original_name', '')
        year = int((d.get('release_date') or d.get('first_air_date') or '0000')[:4]) or None
        description = d.get('overview', '')
        poster = d.get('poster_path')
        poster_url = f'https://image.tmdb.org/t/p/w500{poster}' if poster else None
        backdrop = d.get('backdrop_path')
        backdrop_url = f'https://image.tmdb.org/t/p/original{backdrop}' if backdrop else None
        genres = [g['name'] for g in d.get('genres', [])]
        rating = d.get('vote_average')
        runtime = d.get('runtime') or (d.get('episode_run_time') or [None])[0]
        status = d.get('status')
        seasons_count = d.get('number_of_seasons')
        episodes_count = d.get('number_of_episodes')
        release_date = d.get('release_date') or d.get('first_air_date') or None

        credits = d.get('credits') or {}
        cast_members = [
            {'name': c.get('name'), 'character': c.get('character'), 'profile': c.get('profile_path')}
            for c in (credits.get('cast') or [])[:20]
        ]
        crew = [
            {'name': c.get('name'), 'job': c.get('job'), 'profile': c.get('profile_path')}
            for c in (credits.get('crew') or [])
            if c.get('job') in ('Director', 'Producer', 'Screenplay', 'Writer')
        ]

        # Для сериала загружаем эпизоды первого сезона
        episodes = []
        if media_type == 'series' and seasons_count:
            try:
                s_url = f'https://api.themoviedb.org/3/tv/{tmdb_id}/season/1?api_key={tmdb_key}&language=ru-RU'
                with urllib.request.urlopen(urllib.request.Request(s_url), timeout=8) as sr:
                    sd = json.loads(sr.read().decode())
                episodes = [
                    {'season': 1, 'episode': ep.get('episode_number'), 'name': ep.get('name'), 'overview': ep.get('overview'), 'air_date': ep.get('air_date')}
                    for ep in (sd.get('episodes') or [])
                ]
            except Exception:
                pass

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {schema}.titles
            (tmdb_id, type, title, original_title, year, description, poster_url, backdrop_url,
             genres, cast_members, crew, episodes, rating, runtime, status, seasons_count, episodes_count, release_date, added_manually)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,FALSE)
            ON CONFLICT (tmdb_id) DO UPDATE SET
              title=EXCLUDED.title, description=EXCLUDED.description, poster_url=EXCLUDED.poster_url
            RETURNING id""",
            (tmdb_id, media_type, title, original_title, year, description, poster_url, backdrop_url,
             genres, json.dumps(cast_members, ensure_ascii=False), json.dumps(crew, ensure_ascii=False),
             json.dumps(episodes, ensure_ascii=False), rating, runtime, status,
             seasons_count, episodes_count, release_date or None)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'id': new_id, 'title': title})}

    # manual mode
    required = ['type', 'title']
    for f in required:
        if not body.get(f):
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': f'Поле {f} обязательно'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {schema}.titles
        (type, title, original_title, year, description, poster_url, genres, cast_members, crew, episodes, added_manually)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE)
        RETURNING id""",
        (
            body['type'], body['title'],
            body.get('original_title', ''),
            body.get('year'),
            body.get('description', ''),
            body.get('poster_url', ''),
            body.get('genres', []),
            json.dumps(body.get('cast_members', []), ensure_ascii=False),
            json.dumps(body.get('crew', []), ensure_ascii=False),
            json.dumps(body.get('episodes', []), ensure_ascii=False),
        )
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'id': new_id, 'title': body['title']})}
