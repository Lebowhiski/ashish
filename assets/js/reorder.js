// Visual CMS Reorder Engine for Ashish NR Portfolio
// Handles client-side drag-and-drop grid arrangements

document.addEventListener("DOMContentLoaded", () => {
    let allProjects = [];
    let isChanged = false;

    const col1Bucket = document.getElementById("drag-col-1");
    const col2Bucket = document.getElementById("drag-col-2");
    const col3Bucket = document.getElementById("drag-col-3");
    
    const saveBtn = document.getElementById("save-btn");
    const statusIndicator = document.getElementById("save-status");

    // Retrieve full portfolio database
    async function loadWorkspace() {
        try {
            statusIndicator.textContent = "Loading database...";
            
            const response = await fetch("projects.json");
            const projectSlugs = await response.json();
            
            const fetchPromises = projectSlugs.map(async (slug) => {
                try {
                    const metaResponse = await fetch(`projects/${slug}/metadata.json`);
                    const metadata = await metaResponse.json();
                    return { slug, ...metadata };
                } catch (e) {
                    console.error(`Failed to fetch metadata for: ${slug}`, e);
                    return null;
                }
            });
            
            const loaded = await Promise.all(fetchPromises);
            allProjects = loaded.filter(p => p !== null);
            
            renderWorkspace();
            statusIndicator.textContent = "All changes saved";
            
        } catch (e) {
            console.error("Error building workspace:", e);
            statusIndicator.textContent = "Failed to load database";
        }
    }

    // Sort and render items inside visual columns
    function renderWorkspace() {
        col1Bucket.innerHTML = "";
        col2Bucket.innerHTML = "";
        col3Bucket.innerHTML = "";

        const c1List = [];
        const c2List = [];
        const c3List = [];

        // Distribute into lists based on column
        allProjects.forEach(project => {
            let col = parseInt(project.column);
            if (isNaN(col) || col < 1 || col > 3) {
                col = 1; // Default fallback
            }

            if (col === 1) c1List.push(project);
            else if (col === 2) c2List.push(project);
            else c3List.push(project);
        });

        // Sort each column list by their position property (ascending)
        const sortByPosition = (a, b) => {
            const posA = a.position !== undefined ? parseInt(a.position) : 999;
            const posB = b.position !== undefined ? parseInt(b.position) : 999;
            return posA - posB;
        };

        c1List.sort(sortByPosition);
        c2List.sort(sortByPosition);
        c3List.sort(sortByPosition);

        // Render card elements
        c1List.forEach(p => renderCard(p, col1Bucket));
        c2List.forEach(p => renderCard(p, col2Bucket));
        c3List.forEach(p => renderCard(p, col3Bucket));

        setupDragAndDrop();
    }

    function renderCard(project, bucketElement) {
        const card = document.createElement("div");
        card.className = "drag-card-item";
        card.setAttribute("draggable", "true");
        card.setAttribute("data-slug", project.slug);

        const hasImages = project.images && project.images.length > 0;
        const imagePath = hasImages ? `projects/${project.slug}/${project.images[0]}` : "assets/images/placeholder.jpg";
        
        // Show type tag (ART vs DESIGN) in small letters
        const typeTag = project.category === "art" ? "ART" : "DESIGN";
        
        card.innerHTML = `
            <img class="drag-card-thumb" src="${imagePath}" alt="${project.title}">
            <div class="drag-card-details">
                <div class="drag-card-title">${project.title}</div>
                <div class="drag-card-meta">${typeTag} / COL ${project.column} / POS ${project.position || 0}</div>
            </div>
        `;

        bucketElement.appendChild(card);
    }

    // HTML5 Drag and Drop Handlers
    function setupDragAndDrop() {
        const cards = document.querySelectorAll(".drag-card-item");
        const buckets = document.querySelectorAll(".drag-column-bucket");

        cards.forEach(card => {
            card.addEventListener("dragstart", handleDragStart);
            card.addEventListener("dragend", handleDragEnd);
        });

        buckets.forEach(bucket => {
            bucket.addEventListener("dragover", handleDragOver);
            bucket.addEventListener("dragenter", handleDragEnter);
            bucket.addEventListener("dragleave", handleDragLeave);
            bucket.addEventListener("drop", handleDrop);
        });
    }

    function handleDragStart(e) {
        this.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.getAttribute("data-slug"));
    }

    function handleDragEnd() {
        this.classList.remove("dragging");
        // Update column descriptions dynamically inside cards
        updateCardsVisualMetadata();
    }

    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add("drag-over");
    }

    function handleDragLeave() {
        this.classList.remove("drag-over");
    }

    function handleDragOver(e) {
        e.preventDefault();
        const draggingCard = document.querySelector(".dragging");
        if (!draggingCard) return;

        const afterElement = getDragAfterElement(this, e.clientY);
        if (afterElement == null) {
            this.appendChild(draggingCard);
        } else {
            this.insertBefore(draggingCard, afterElement);
        }
        
        markAsUnchanged(false); // Mark as unsaved
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove("drag-over");
        updateCardsVisualMetadata();
    }

    // Helper to calculate card below pointer for inserting before
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".drag-card-item:not(.dragging)")];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Dynamically update subtitles inside cards to reflect new dragged columns
    function updateCardsVisualMetadata() {
        [col1Bucket, col2Bucket, col3Bucket].forEach((bucket, index) => {
            const colNum = index + 1;
            const cards = bucket.querySelectorAll(".drag-card-item");
            
            cards.forEach((card, posIndex) => {
                const slug = card.getAttribute("data-slug");
                const project = allProjects.find(p => p.slug === slug);
                const typeTag = project ? (project.category === "art" ? "ART" : "DESIGN") : "ART";
                
                const metaEl = card.querySelector(".drag-card-meta");
                if (metaEl) {
                    metaEl.textContent = `${typeTag} / COL ${colNum} / POS ${posIndex + 1}`;
                }
            });
        });
    }

    function markAsUnchanged(saved) {
        isChanged = !saved;
        if (isChanged) {
            statusIndicator.textContent = "Unsaved Changes*";
            statusIndicator.classList.add("unsaved");
        } else {
            statusIndicator.textContent = "All changes saved";
            statusIndicator.classList.remove("unsaved");
        }
    }

    // Compile state lists, build ranks payload, and post to backend
    async function saveLayout() {
        if (saveBtn.classList.contains("saving")) return;

        saveBtn.classList.add("saving");
        saveBtn.textContent = "SAVING...";

        const payload = [];

        // Scrape Column 1
        const c1Cards = col1Bucket.querySelectorAll(".drag-card-item");
        c1Cards.forEach((card, index) => {
            payload.push({
                slug: card.getAttribute("data-slug"),
                column: 1,
                position: index + 1
            });
        });

        // Scrape Column 2
        const c2Cards = col2Bucket.querySelectorAll(".drag-card-item");
        c2Cards.forEach((card, index) => {
            payload.push({
                slug: card.getAttribute("data-slug"),
                column: 2,
                position: index + 1
            });
        });

        // Scrape Column 3
        const c3Cards = col3Bucket.querySelectorAll(".drag-card-item");
        c3Cards.forEach((card, index) => {
            payload.push({
                slug: card.getAttribute("data-slug"),
                column: 3,
                position: index + 1
            });
        });

        try {
            const response = await fetch("/api/save-layout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("HTTP error saving layout");
            }

            const data = await response.json();
            console.log("Save layout success:", data);

            // Trigger visual success indicators
            saveBtn.classList.remove("saving");
            saveBtn.classList.add("success");
            saveBtn.textContent = "SAVED!";
            
            markAsUnchanged(true); // Mark as saved

            setTimeout(() => {
                saveBtn.classList.remove("success");
                saveBtn.textContent = "SAVE LAYOUT";
            }, 2000);

        } catch (e) {
            console.error("Failed to save layout:", e);
            saveBtn.classList.remove("saving");
            saveBtn.textContent = "SAVE ERROR";
            statusIndicator.textContent = "Save failed (Server error)";
            
            setTimeout(() => {
                saveBtn.textContent = "SAVE LAYOUT";
            }, 3000);
        }
    }

    saveBtn.addEventListener("click", saveLayout);

    // Initial load
    loadWorkspace();
});
