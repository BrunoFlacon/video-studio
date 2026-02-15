# Live Cut Editor

A web-based video editor for creating and editing video clips directly in the browser.

## Project Structure

The project root is `test-real`.

### Directory Layout

- **`editor.php`**: The main entry point for the application.
- **`app_settings.js` / `project_settings.js`**: Configuration files.

### `api/`
Backend PHP scripts.
- `db.php`: Database connection.
- `upload.php`: Handles file uploads.
- `export.php`: Manages video export.

### `uploads/`
Stores user uploaded media.

### `exports/`
Stores rendered video files.

### `assets/`
Frontend resources only.
- **`css/`**: Stylesheets.
- **`js/`**: JavaScript modules.
    - `core/`: Core editor logic.
- **`img/`**: Static images.

## Setup

1.  **Environment**: Requires a PHP server (e.g., WAMP, XAMPP).
2.  **Database**: Ensure `assets/api/db.php` is configured with your database credentials.
3.  **Access**: Navigate to `http://localhost/Live-Cut-Editor/test-real/editor.php` in your browser.

## Key Features

- Timeline-based video editing.
- Audio and video track management.
- Real-time preview.
- Project status persistence.
