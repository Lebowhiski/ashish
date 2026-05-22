// Dynamic Editorial Project Details Engine for Ashish N Remesh Portfolio

document.addEventListener("DOMContentLoaded", () => {
    // 1. Extract project ID from query parameters (?id=malhara)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");
    
    if (!projectId) {
        // Redirection fallback to home if no ID is present
        window.location.href = "index.html";
        return;
    }

    const titleEl = document.getElementById("project-title");
    const descEl = document.getElementById("project-description");
    const metaEl = document.getElementById("project-meta-list");
    const mediaEl = document.getElementById("project-media-list");

    // Fetch and populate page content
    async function loadProjectDetails() {
        try {
            const response = await fetch(`projects/${projectId}/metadata.json`);
            if (!response.ok) {
                throw new Error("Project metadata not found");
            }
            
            const project = await response.json();
            if (!project) return;

            // Set document title
            document.title = `${project.title} - Ashish NR`;

            // 2. Populate Floating Title (Column 1)
            titleEl.textContent = project.title;

            // 3. Populate Description paragraph (Column 2)
            descEl.textContent = project.description || "No description provided.";

            // 4. Populate Metadata list (Column 3)
            const metaItems = [
                { label: "Date", value: project.date },
                { label: "Timeline", value: project.timeline },
                { label: "Role", value: project.role },
                { label: "Collaborators", value: project.collaborators }
            ];

            metaEl.innerHTML = "";
            metaItems.forEach(item => {
                if (item.value && item.value !== "N/A" && item.value !== "None" && item.value !== "Unknown") {
                    const li = document.createElement("div");
                    li.className = "meta-item";
                    li.innerHTML = `
                        <span class="meta-label">${item.label}:</span>
                        <span class="meta-value">${item.value}</span>
                    `;
                    metaEl.appendChild(li);
                } else if (item.label === "Collaborators" || item.label === "Role" || item.label === "Date") {
                    // Always show core items with fallback values
                    const li = document.createElement("div");
                    li.className = "meta-item";
                    li.innerHTML = `
                        <span class="meta-label">${item.label}:</span>
                        <span class="meta-value">${item.value || "None"}</span>
                    `;
                    metaEl.appendChild(li);
                }
            });

            // 5. Stack Project Images vertically below, aligned with Column 2
            mediaEl.innerHTML = "";
            
            if (project.images && project.images.length > 0) {
                // If there are multiple images, display them in order
                project.images.forEach((imgFilename) => {
                    const imgPath = `projects/${projectId}/${imgFilename}`;
                    const mediaItem = document.createElement("img");
                    mediaItem.className = "project-media-item";
                    mediaItem.src = imgPath;
                    mediaItem.alt = `${project.title} detailed media`;
                    mediaItem.loading = "lazy";
                    mediaEl.appendChild(mediaItem);
                });
            } else {
                mediaEl.innerHTML = `<p class="project-media-item" style="color: rgba(255,255,255,0.3); background: none; padding: 20px 0;">No project images uploaded yet.</p>`;
            }

        } catch (e) {
            console.error("Error loading project details:", e);
            // Display error state to user gracefully
            descEl.innerHTML = `<span style="color: #ff4d4d;">Failed to load project details. Please check the project directory and metadata configuration.</span>`;
        }
    }

    loadProjectDetails();
});
