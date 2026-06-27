import os
import json
import urllib.request
import urllib.parse
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    """Поиск фильмов и сериалов: сначала в локальной БД, потом в TMDB."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    query = (params.get('q') or '').strip()

    if not query:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нужен параметр q'})}

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(
        f"SELECT id, tmdb_id, type, title, original_title, year, description, poster_url, genres, rating, added_manually FROM {schema}.titles WHERE title ILIKE %s OR original_title ILIKE %s LIMIT 10",
        (f'%{query}%', f'%{query}%')
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    local_results = []
    local_tmdb_ids = set()
    for r in rows:
        local_tmdb_ids.add(r[1])
        local_results.append({
            'source': 'local',
            'id': r[0],
            'tmdb_id': r[1],
            'type': r[2],
            'title': r[3],
            'original_title': r[4],
            'year': r[5],
            'description': r[6],
            'poster_url': r[7],
            'genres': r[8] or [],
            'rating': float(r[9]) if r[9] else None,
            'added_manually': r[10],
        })

    tmdb_results = []
    tmdb_key = os.environ.get('TMDB_API_KEY', '')
    if tmdb_key:
        encoded = urllib.parse.quote(query)
        url = f'https://api.themoviedb.org/3/search/multi?api_key={tmdb_key}&query={encoded}&language=ru-RU&page=1'
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
            for item in (data.get('results') or [])[:10]:
                media = item.get('media_type')
                if media not in ('movie', 'tv'):
                    continue
                tmdb_id = item.get('id')
                if tmdb_id in local_tmdb_ids:
                    continue
                poster = item.get('poster_path')
                tmdb_results.append({
                    'source': 'tmdb',
                    'tmdb_id': tmdb_id,
                    'type': 'movie' if media == 'movie' else 'series',
                    'title': item.get('title') or item.get('name', ''),
                    'original_title': item.get('original_title') or item.get('original_name', ''),
                    'year': (item.get('release_date') or item.get('first_air_date') or '')[:4] or None,
                    'description': item.get('overview', ''),
                    'poster_url': f'https://image.tmdb.org/t/p/w500{poster}' if poster else None,
                    'genres': [],
                    'rating': item.get('vote_average'),
                    'added_manually': False,
                })
        except Exception:
            pass

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'local': local_results, 'tmdb': tmdb_results}, ensure_ascii=False),
    }
