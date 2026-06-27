import os
import json
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def handler(event: dict, context) -> dict:
    """Трекер: карточка тайтла, статусы, прогресс эпизодов, избранное (action через query или body)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id', '').strip()
    params = event.get('queryStringParameters') or {}
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    method = event.get('httpMethod', 'GET')

    # --- GET: карточка тайтла ---
    if method == 'GET':
        title_id = params.get('id')
        if not title_id:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужен id'})}

        cur.execute(
            f"""SELECT id, tmdb_id, type, title, original_title, year, description,
                   poster_url, backdrop_url, genres, cast_members, crew, episodes,
                   rating, runtime, status, seasons_count, episodes_count, release_date, reviews
                FROM {schema}.titles WHERE id = %s""",
            (title_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Не найдено'})}

        def safe_json(val):
            if isinstance(val, (list, dict)):
                return val
            if val is None:
                return []
            return val

        title_data = {
            'id': row[0], 'tmdb_id': row[1], 'type': row[2], 'title': row[3],
            'original_title': row[4], 'year': row[5], 'description': row[6],
            'poster_url': row[7], 'backdrop_url': row[8],
            'genres': row[9] or [],
            'cast_members': safe_json(row[10]),
            'crew': safe_json(row[11]),
            'episodes': safe_json(row[12]),
            'rating': float(row[13]) if row[13] else None,
            'runtime': row[14], 'status': row[15],
            'seasons_count': row[16], 'episodes_count': row[17],
            'release_date': str(row[18]) if row[18] else None,
            'reviews': safe_json(row[19]),
        }

        user_status = None
        episode_progress = []
        is_favorite = False

        if session_id:
            cur.execute(f"SELECT status FROM {schema}.watch_status WHERE session_id=%s AND title_id=%s", (session_id, title_id))
            ws = cur.fetchone()
            if ws:
                user_status = ws[0]

            cur.execute(f"SELECT season, episode, watched FROM {schema}.episode_progress WHERE session_id=%s AND title_id=%s", (session_id, title_id))
            episode_progress = [{'season': r[0], 'episode': r[1], 'watched': r[2]} for r in cur.fetchall()]

            cur.execute(f"SELECT id FROM {schema}.favorites WHERE session_id=%s AND title_id=%s", (session_id, title_id))
            is_favorite = cur.fetchone() is not None

        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'title': title_data, 'user_status': user_status, 'episode_progress': episode_progress, 'is_favorite': is_favorite}, ensure_ascii=False, default=str)}

    # --- POST: действия пользователя ---
    if method == 'POST':
        if not session_id:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужен X-Session-Id'})}

        body = json.loads(event.get('body') or '{}')
        action = body.get('action')
        result = {}

        if action == 'set_status':
            title_id = body.get('title_id')
            status = body.get('status')
            if not title_id or status not in ('watching', 'watched', 'planned', 'dropped'):
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужен title_id и валидный status'})}
            cur.execute(
                f"""INSERT INTO {schema}.watch_status (session_id, title_id, status, updated_at)
                    VALUES (%s,%s,%s,NOW())
                    ON CONFLICT (session_id, title_id) DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()""",
                (session_id, title_id, status)
            )
            result = {'ok': True, 'status': status}

        elif action == 'toggle_episode':
            title_id = body.get('title_id')
            season = body.get('season', 1)
            episode = body.get('episode')
            watched = body.get('watched', True)
            if not title_id or episode is None:
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужен title_id и episode'})}
            cur.execute(
                f"""INSERT INTO {schema}.episode_progress (session_id, title_id, season, episode, watched, updated_at)
                    VALUES (%s,%s,%s,%s,%s,NOW())
                    ON CONFLICT (session_id, title_id, season, episode) DO UPDATE SET watched=EXCLUDED.watched, updated_at=NOW()""",
                (session_id, title_id, season, episode, watched)
            )
            result = {'ok': True, 'episode': episode, 'watched': watched}

        elif action == 'toggle_favorite':
            title_id = body.get('title_id')
            if not title_id:
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужен title_id'})}
            cur.execute(f"SELECT id FROM {schema}.favorites WHERE session_id=%s AND title_id=%s", (session_id, title_id))
            existing = cur.fetchone()
            if existing:
                result = {'ok': True, 'is_favorite': True}
            else:
                cur.execute(f"INSERT INTO {schema}.favorites (session_id, title_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (session_id, title_id))
                result = {'ok': True, 'is_favorite': True}

        elif action == 'get_favorites':
            cur.execute(
                f"""SELECT t.id, t.type, t.title, t.poster_url, t.year, t.rating, f.added_at
                    FROM {schema}.favorites f JOIN {schema}.titles t ON t.id = f.title_id
                    WHERE f.session_id = %s ORDER BY f.added_at DESC""",
                (session_id,)
            )
            result = {'favorites': [{'id': r[0], 'type': r[1], 'title': r[2], 'poster_url': r[3], 'year': r[4], 'rating': float(r[5]) if r[5] else None, 'added_at': str(r[6])} for r in cur.fetchall()]}

        elif action == 'get_watchlist':
            cur.execute(
                f"""SELECT t.id, t.type, t.title, t.poster_url, t.year, t.rating, ws.status, ws.updated_at
                    FROM {schema}.watch_status ws JOIN {schema}.titles t ON t.id = ws.title_id
                    WHERE ws.session_id = %s ORDER BY ws.updated_at DESC""",
                (session_id,)
            )
            result = {'watchlist': [{'id': r[0], 'type': r[1], 'title': r[2], 'poster_url': r[3], 'year': r[4], 'rating': float(r[5]) if r[5] else None, 'status': r[6], 'updated_at': str(r[7])} for r in cur.fetchall()]}

        else:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': f'Неизвестное действие: {action}'})}

        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(result, ensure_ascii=False)}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}
