import http.server
import socketserver
import json
import os
import sys

PORT = 8080
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")
PROJECTS_JSON = os.path.join(BASE_DIR, "projects.json")

class CMSHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Override to make sure files are served from the directory containing server.py
        path = super().translate_path(path)
        rel_path = os.path.relpath(path, os.getcwd())
        return os.path.join(BASE_DIR, rel_path)

    def do_POST(self):
        if self.path == '/api/save-layout':
            self.handle_save_layout()
        elif self.path == '/api/create-project':
            self.handle_create_project()
        else:
            # Fallback for unrecognized POST requests
            self.send_error(404, "Endpoint not found")

    def handle_save_layout(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            print(f"\n--- Saving Visual Layout (Received {len(payload)} items) ---")

            # 1. Gather slugs in the order received
            slugs_order = [item['slug'] for item in payload]

            # 2. Update projects.json with the visual ordering
            with open(PROJECTS_JSON, 'w') as f:
                json.dump(slugs_order, f, indent=2)
            print(f"✔ Overwritten projects.json visually index order.")

            # 3. Update column and position in each project's metadata.json
            updated_count = 0
            for item in payload:
                slug = item['slug']
                col = item['column']
                pos = item['position']
                
                # Check for random string and sanitize
                if col == "random":
                    column_val = "random"
                else:
                    try:
                        column_val = int(col)
                    except ValueError:
                        column_val = 1
                
                try:
                    position_val = int(pos)
                except ValueError:
                    position_val = 1

                meta_path = os.path.join(PROJECTS_DIR, slug, "metadata.json")
                if os.path.exists(meta_path):
                    # Load current metadata
                    with open(meta_path, 'r') as f:
                        meta = json.load(f)
                    
                    # Update parameters
                    meta['column'] = column_val
                    meta['position'] = position_val
                    
                    # Save metadata
                    with open(meta_path, 'w') as f:
                        json.dump(meta, f, indent=2)
                    
                    updated_count += 1
                else:
                    print(f"⚠ Warning: Metadata not found for slug: {slug}")

            print(f"✔ Successfully updated {updated_count} individual metadata.json files.")
            print("--------------------------------------------------\n")

            # Send successful response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "status": "success",
                "message": f"Layout saved! Updated projects.json and {updated_count} metadata files successfully."
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            print(f"❌ Error saving layout details: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                "status": "error",
                "message": f"Server failed to write files: {str(e)}"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def handle_create_project(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            title = payload.get('title', 'Untitled').strip()
            slug = payload.get('slug', '').strip()
            category = payload.get('category', 'design').strip()
            column = payload.get('column', 1)
            position = payload.get('position', 1)
            date = payload.get('date', '2025').strip()
            timeline = payload.get('timeline', 'N/A').strip()
            role = payload.get('role', 'Designer').strip()
            collaborators = payload.get('collaborators', 'None').strip()
            description = payload.get('description', '').strip()
            raw_images = payload.get('images', [])

            if not slug:
                raise ValueError("Project slug is required")

            # Clean slug to avoid directory traversal
            slug = os.path.basename(slug.lower().replace(' ', '-').replace('/', '').replace('\\', ''))
            
            project_dir = os.path.join(PROJECTS_DIR, slug)
            os.makedirs(project_dir, exist_ok=True)
            print(f"✔ Created project directory: {project_dir}")

            # Decode and save image files on server disk
            images_list = []
            for img in raw_images:
                if isinstance(img, dict) and 'name' in img and 'content' in img:
                    img_name = img['name']
                    img_content = img['content']
                    
                    # Extract base64 part
                    if ',' in img_content:
                        header, base64_data = img_content.split(',', 1)
                    else:
                        base64_data = img_content
                    
                    import base64
                    try:
                        file_bytes = base64.b64decode(base64_data)
                        img_path = os.path.join(project_dir, img_name)
                        with open(img_path, 'wb') as img_f:
                            img_f.write(file_bytes)
                        print(f"✔ Saved dropped image file: {img_path}")
                        images_list.append(img_name)
                    except Exception as img_err:
                        print(f"❌ Failed to decode/save image {img_name}: {img_err}")
                elif isinstance(img, str):
                    images_list.append(img)

            metadata = {
                "title": title,
                "category": category,
                "column": column,
                "position": position,
                "date": date,
                "timeline": timeline,
                "role": role,
                "collaborators": collaborators,
                "description": description,
                "images": images_list
            }

            meta_path = os.path.join(project_dir, "metadata.json")
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"✔ Wrote metadata.json at: {meta_path}")

            # Update projects.json list
            index_list = []
            if os.path.exists(PROJECTS_JSON):
                with open(PROJECTS_JSON, 'r') as f:
                    index_list = json.load(f)
            
            if slug not in index_list:
                index_list.append(slug)
                with open(PROJECTS_JSON, 'w') as f:
                    json.dump(index_list, f, indent=2)
                print(f"✔ Added slug '{slug}' to projects.json list.")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "status": "success",
                "message": "Project created successfully!",
                "projectDir": project_dir,
                "slug": slug
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            print(f"❌ Error creating project: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                "status": "error",
                "message": f"Server failed to create project: {str(e)}"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

# Allow port reuse
socketserver.TCPServer.allow_reuse_address = True

print(f"Visual CMS Server running at http://localhost:{PORT}")
print("Press Ctrl+C to stop.")

with socketserver.TCPServer(("", PORT), CMSHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Visual CMS Server...")
        httpd.server_close()
        sys.exit(0)
