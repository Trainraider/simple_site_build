# Simple Build System

## Overview

This simple build system creates a single-file website by processing an input HTML file and injecting content from other files. The end result can be easily distributed and run locally in a browser without a server. It's designed as a straightforward alternative to complex build tools like webpack, and useful for AI-assisted development by providing contextual information via the placeholder format. The system outputs to the `docs` folder, making it easy to host for free on GitHub Pages.

## How to Use

1. **Project Structure**:
   - Place your main HTML file named `index.html` in the `src` directory.
   - Organize other files (CSS, JavaScript, images, Markdown) in subdirectories within `src`.
   - It's a good idea to put `main.js`/`index.js` directly in `src`, and ensure all other scripts from `src/scripts` come before it, for example.
     - For example, `main.js` is the main entry point for execution, while other scripts only provide definitions for classes and functions.

2. **Use Injection Comments**:
   In your HTML, CSS, JavaScript, or Markdown files, use special comments to indicate where to inject other files:

   For HTML:
   ```html
   <!-- inject "path/to/file" here -->
   ```

   For CSS/JavaScript (including inside `<style>` and `<script>` tags in your HTML):
   ```css
   /* inject "path/to/file" here */
   ```

   For Markdown:
   ```markdown
   [//]: # ( inject "path/to/file" here )
   ```

   Paths should be relative to the project root. Wildcards are supported.

3. **Run the Build Script**:
   Install the package globally or locally:

   ```
   npm install -g simple-build-system
   ```

   Then execute the build command:

   ```
   build --minify
   ```

4. **Check the Output**:
   The processed file will be created as `docs/index.html`.

## Example

Here's an example `src/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Project</title>
    <style>
        /* inject "src/styles/main.css" here */
    </style>
</head>
<body>
    <h1>Welcome to the Test Project</h1>
    <div class="image-gallery">
        <!-- inject "src/*.jpg" here -->
    </div>
    <!-- inject "src/*.svg" here -->
    <!-- inject "src/content/*.html" here -->
    <!-- inject "src/content/main.md" here -->
    <script>
        /* inject "src/scripts/*.js" here */
        /* inject "src/main.js" here */
    </script>
</body>
</html>
```

This structure allows you to:

1. Inject CSS from `src/styles/main.css`
   - `main.css` may inject other CSS files into itself in a specific order.
2. Include all JPG images from the `src` directory in the image gallery.
3. Insert all SVG files from the `src` directory.
4. Include all HTML files from `src/content`.
5. Inject and process Markdown content from `src/content/main.md`.
6. Inject all JavaScript files from `src/scripts`, followed by `main.js`.

## Markdown Injection Example

Here's an example of nested Markdown injection:

`src/content/main.md`:
```markdown
# Markdown Content

This is a demonstration of nested Markdown content.

## Subsection

Here's a list of items:

1. First item
2. Second item
3. Third item

[//]: # ( inject "src/content/nested.md" here )

## Another Subsection

This is after the nested content.
```

`src/content/nested.md`:
```markdown
### Nested Markdown Content

This content is nested within the main Markdown file.

- Nested item 1
- Nested item 2
- Nested item 3

[//]: # ( inject "src/content/deeply_nested.md" here )
```

`src/content/deeply_nested.md`:
```markdown
#### Deeply Nested Markdown Content

This content is deeply nested within the Markdown files.

1. Deep item A
2. Deep item B
3. Deep item C
```

## Key Features

- **Text Injection**: Injects content of text files directly.
- **Image Injection**: Converts images to base64-encoded data URIs.
- **SVG Processing**: Injects SVG files and processes nested injections.
- **Markdown Processing**: Injects and processes Markdown files, including nested Markdown injections.
- **Wildcard Support**: Allows injection of multiple files using patterns.
- **Recursive Processing**: Supports nested injections (up to 10 levels deep).

## Best Practices

1. Break down your project into small, focused files for easier management and AI assistance.
2. Use clear, descriptive names for files and folders.
3. Provide context within each file about its purpose and relationships to other components.
4. Regularly run the build system to ensure proper integration of components.
5. When using Markdown, take advantage of nested injections to organize your content logically.

## Limitations

- Maximum recursion depth of 10 for nested injections.
- Large images may significantly increase the output file size.
- Wildcard injections are processed in alphabetical order.
- Markdown files are converted to HTML before being injected into the final output.

---

**Installation and Usage**

To use this build system in your project:

1. **Install the Package**

   ```bash
   npm install -g simple-build-system
   ```

2. **Run the Build Command**

   ```bash
   build --minify
   ```

   - The `--minify` option is optional. If included, the build system will minify the output.

3. **Output**

   - The final, processed file will be located in the `docs` directory as `index.html`.

---

**License**

This project is licensed under the MIT License.
