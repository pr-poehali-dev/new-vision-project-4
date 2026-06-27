import os
import json
import urllib.request
import urllib.parse
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

TITLES_TO_SEED = [
    # Фильмы
    {"query": "Настоятель", "year": None, "type": "movie"},
    {"query": "Отставник", "year": None, "type": "movie"},
    {"query": "Один дома", "year": None, "type": "movie"},
    # Сериалы
    {"query": "Сваты", "year": None, "type": "series"},
    {"query": "Воронины", "year": None, "type": "series"},
    {"query": "Интерны", "year": None, "type": "series"},
    {"query": "ДМБ", "year": None, "type": "series"},
    {"query": "СашаТаня", "year": None, "type": "series"},
    {"query": "Возвращение Мухтара", "year": None, "type": "series"},
    {"query": "Мухтар. Новый след", "year": None, "type": "series"},
    {"query": "Глухарь", "year": None, "type": "series"},
    {"query": "Пятницкий", "year": None, "type": "series"},
    {"query": "Карпов", "year": None, "type": "series"},
    {"query": "Пёс", "year": None, "type": "series"},
    {"query": "Полицейский с Рублёвки", "year": None, "type": "series"},
    {"query": "Меч", "year": None, "type": "series"},
    {"query": "Бессонница", "year": None, "type": "series"},
    {"query": "Шеф", "year": 2012, "type": "series"},
    {"query": "Невский", "year": None, "type": "series"},
    {"query": "Ментовские войны", "year": None, "type": "series"},
    {"query": "Улицы разбитых фонарей", "year": None, "type": "series"},
    {"query": "Тайны следствия", "year": None, "type": "series"},
    {"query": "Бандитский Петербург", "year": None, "type": "series"},
    {"query": "Агент национальной безопасности", "year": None, "type": "series"},
    {"query": "Убойная сила", "year": None, "type": "series"},
    {"query": "Литейный", "year": None, "type": "series"},
    {"query": "Полицейское братство", "year": None, "type": "series"},
    {"query": "Лучшие враги", "year": None, "type": "series"},
    {"query": "Первый отдел", "year": None, "type": "series"},
    {"query": "Чужой район", "year": None, "type": "series"},
    {"query": "Дознаватель", "year": None, "type": "series"},
    {"query": "ППС", "year": None, "type": "series"},
    {"query": "Реализация", "year": None, "type": "series"},
    {"query": "Марш Турецкого", "year": None, "type": "series"},
    {"query": "Каменская", "year": None, "type": "series"},
    {"query": "Гражданин начальник", "year": None, "type": "series"},
    {"query": "Лихач", "year": None, "type": "series"},
    {"query": "Гончие", "year": None, "type": "series"},
    {"query": "Государственная защита", "year": 2010, "type": "series"},
    {"query": "Последнее путешествие Синдбада", "year": None, "type": "series"},
    {"query": "Предатель", "year": None, "type": "series"},
    {"query": "Перевозчик", "year": None, "type": "series"},
    {"query": "Шаман", "year": None, "type": "series"},
    {"query": "Морские дьяволы", "year": None, "type": "series"},
    {"query": "Спецназ", "year": None, "type": "series"},
    {"query": "Инспектор Купер", "year": None, "type": "series"},
    {"query": "Наш спецназ", "year": None, "type": "series"},
    {"query": "Условный мент", "year": None, "type": "series"},
    {"query": "Великолепная пятёрка", "year": None, "type": "series"},
    {"query": "Шальной отдел", "year": None, "type": "series"},
    {"query": "Закон тайги", "year": None, "type": "series"},
    {"query": "Игра", "year": None, "type": "series"},
    {"query": "Тверская", "year": None, "type": "series"},
    {"query": "Дельфин", "year": None, "type": "series"},
    {"query": "Горячая точка", "year": None, "type": "series"},
    {"query": "Профессионал", "year": 2014, "type": "series"},
    {"query": "Версия", "year": None, "type": "series"},
    {"query": "Внутреннее расследование", "year": None, "type": "series"},
    {"query": "Ковбои", "year": None, "type": "series"},
    {"query": "Опера. Хроники убойного отдела", "year": None, "type": "series"},
    {"query": "Чужой", "year": None, "type": "series"},
    {"query": "Отпуск по ранению", "year": None, "type": "series"},
    {"query": "Филин", "year": None, "type": "series"},
    {"query": "Настоящий", "year": None, "type": "series"},
    {"query": "Великолепная пятёрка", "year": None, "type": "series"},
]

def search_tmdb(query: str, media_type: str, year: int | None, api_key: str):
    """Ищет тайтл в TMDB и возвращает первый подходящий результат."""
    endpoint = 'movie' if media_type == 'movie' else 'tv'
    encoded = urllib.parse.quote(query)
    year_param = f'&year={year}' if year else ''
    url = f'https://api.themoviedb.org/3/search/{endpoint}?api_key={api_key}&query={encoded}&language=ru-RU&page=1{year_param}'
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=8) as r:
            data = json.loads(r.read().decode())
        results = data.get('results') or []
        return results[0] if results else None
    except Exception:
        return None

def fetch_details(tmdb_id: int, media_type: str, api_key: str):
    endpoint = 'movie' if media_type == 'movie' else 'tv'
    url = f'https://api.themoviedb.org/3/{endpoint}/{tmdb_id}?api_key={api_key}&language=ru-RU&append_to_response=credits'
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception:
        return None

def handler(event: dict, context) -> dict:
    """Наполнение БД фильмами и сериалами через TMDB. POST для запуска."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'POST only'})}

    tmdb_key = os.environ.get('TMDB_API_KEY', '')
    if not tmdb_key:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'TMDB_API_KEY не задан'})}

    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    added = []
    skipped = []
    failed = []

    for item in TITLES_TO_SEED:
        query = item['query']
        media_type = item['type']
        year = item.get('year')

        result = search_tmdb(query, media_type, year, tmdb_key)
        if not result:
            failed.append(query)
            continue

        tmdb_id = result.get('id')
        # Проверяем, есть ли уже в базе
        cur.execute(f"SELECT id FROM {schema}.titles WHERE tmdb_id=%s", (tmdb_id,))
        if cur.fetchone():
            skipped.append(query)
            continue

        d = fetch_details(tmdb_id, media_type, tmdb_key)
        if not d:
            d = result

        title = d.get('title') or d.get('name') or query
        original_title = d.get('original_title') or d.get('original_name', '')
        raw_date = d.get('release_date') or d.get('first_air_date') or ''
        title_year = int(raw_date[:4]) if raw_date and len(raw_date) >= 4 else year
        description = d.get('overview', '')
        poster = d.get('poster_path')
        poster_url = f'https://image.tmdb.org/t/p/w500{poster}' if poster else None
        backdrop = d.get('backdrop_path')
        backdrop_url = f'https://image.tmdb.org/t/p/original{backdrop}' if backdrop else None
        genres = [g['name'] for g in d.get('genres', [])] if d.get('genres') else []
        rating = d.get('vote_average')
        runtime = d.get('runtime') or (d.get('episode_run_time') or [None])[0]
        status = d.get('status')
        seasons_count = d.get('number_of_seasons')
        episodes_count = d.get('number_of_episodes')
        release_date = raw_date or None

        credits = d.get('credits') or {}
        cast_members = [
            {'name': c.get('name'), 'character': c.get('character'), 'profile': c.get('profile_path')}
            for c in (credits.get('cast') or [])[:15]
        ]
        crew = [
            {'name': c.get('name'), 'job': c.get('job')}
            for c in (credits.get('crew') or [])
            if c.get('job') in ('Director', 'Producer', 'Screenplay', 'Writer')
        ]

        try:
            cur.execute(
                f"""INSERT INTO {schema}.titles
                    (tmdb_id, type, title, original_title, year, description, poster_url, backdrop_url,
                     genres, cast_members, crew, rating, runtime, status, seasons_count, episodes_count, release_date, added_manually)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,FALSE)
                    ON CONFLICT (tmdb_id) DO NOTHING""",
                (tmdb_id, media_type, title, original_title, title_year, description, poster_url, backdrop_url,
                 genres, json.dumps(cast_members, ensure_ascii=False), json.dumps(crew, ensure_ascii=False),
                 rating, runtime, status, seasons_count, episodes_count, release_date or None)
            )
            conn.commit()
            added.append(title)
        except Exception as e:
            conn.rollback()
            failed.append(f"{query}: {str(e)}")

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': CORS,
        'body': json.dumps({'added': added, 'skipped': skipped, 'failed': failed}, ensure_ascii=False),
    }
