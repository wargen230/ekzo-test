# Ekzo-Test API

Repository: [Wargencob/ekzo-test](https://github.com/Wargencob/ekzo-test)

## Описание проекта

Ekzo-Test — это RESTful API для управления файлами с поддержкой аутентификации на основе JWT и разграничением прав доступа (роль `admin` и роль `guest`). Проект позволяет:

- Загрузить файл в хранилище MinIO
- Сохранить информацию о файле в SQLite
- Получить список загруженных файлов
- Скачать файл через API
- Обновлять метаданные и заменять файлы (для `admin`)
- Удалять файлы и поддерживать последовательность `id` без пропусков (для `admin`)
---

## Используемые технологии

- **Node.js** и **Express** — веб-сервер и маршруты
- **SQLite3** — встроенная СУБД для хранения метаданных
- **MinIO** — S3-совместимое файловое хранилище
- **JWT (jsonwebtoken)** — аутентификация и авторизация
- **multer** — парсинг multipart/form-data для загрузки файлов
- **bcrypt** — безопасное хранение паролей
- **dotenv** — загрузка конфигурации из `.env`

---

## Установка на Linux

```bash
# 1. Клонируем репозиторий
git clone git@github.com:Wargencob/ekzo-test
cd ekzo-test

# 2. Устанавливаем зависимости
npm install

# 3. Настраиваем переменные окружения
touch .env && vim .env
# Отредактируйте .env, указав свои значения:
# PORT, JWT_SECRET, MINIO_HOST, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_URL

# 4. Запускаем MinIO (если не запущен)
minio server /mnt/data

# 5. Запускаем сервер
nodejs index.js
```

По умолчанию сервер будет доступен на `http://localhost:3000`.

---

## Функционал API

### Аутентификация

- **POST /login** — выдача JWT токена

  **Request** (JSON):
  ```json
  {
    "login": "admin",
    "password": "admin123"
  }
  ```

  **Response**:
  ```json
  { "token": "<JWT токен>" }
  ```

### Маршруты для файлов

Все запросы к `/ekzo-test/...` требуют заголовок:
```
Authorization: Bearer <JWT токен>
```

| Метод | Путь                       | Роли        | Описание                                             |
|-------|----------------------------|-------------|------------------------------------------------------|
| GET   | `/ekzo-test`               | admin,guest | Получить список всех файлов                          |
| GET   | `/ekzo-test/files/:name`   | admin,guest | Скачать файл с именем `:name`                        |
| POST  | `/ekzo-test/upload`        | admin       | Загрузить файл (multipart/form-data: `file`, `status`)|
| PUT   | `/ekzo-test/files/:name`   | admin       | Обновить метаданные и/или заменить файл              |
| DELETE| `/ekzo-test/files/:name`   | admin       | Удалить файл и перенумеровать `id` в БД             |

---

## Примеры запросов (cURL)

1. **Авторизация**
   ```bash
   curl -X POST http://localhost:3000/login         -H "Content-Type: application/json"         -d '{"username":"guest","password":"guest123"}'
   ```

2. **Получить список**
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/ekzo-test
   ```

3. **Загрузить файл (admin)**
   ```bash
   curl -X POST http://localhost:3000/ekzo-test/upload         -H "Authorization: Bearer <token>"         -F "file=@./example.txt"         -F "status=Draft"
   ```

4. **Скачать файл**
   ```bash
   curl -O -H "Authorization: Bearer <token>" http://localhost:3000/ekzo-test/files/example.txt
   ```

5. **Удалить файл (admin)**
   ```bash
   curl -X DELETE http://localhost:3000/ekzo-test/files/example.txt         -H "Authorization: Bearer <token>"
   ```

---

## Тестирование

Для тестирование каждый желающий может создать свой API запрос по адресу http://3281bf5af7de.vps.myjino.ru:49207, на нём сейчас развёрнут VPS сервер на Ubuntu, который будет принимать ваши запросы и отвечать.
### Пример для скачивания файла из БД:
```bash
curl -O -H "Authorization: Bearer <token>" http://3281bf5af7de.vps.myjino.ru:49207/ekzo-test/files/:test.txt
```
# ekzo-test
