// Main Application Engine for Ashish N Remesh Portfolio

document.addEventListener("DOMContentLoaded", () => {
    let allProjects = [];
    let currentFilter = "all";
    
    // Lightbox state variables
    let activeIllustrations = [];
    let currentLightboxIdx = -1;
    
    const col1 = document.getElementById("col-1");
    const col2 = document.getElementById("col-2");
    const col3 = document.getElementById("col-3");
    
    const filterBtnAll = document.getElementById("filter-all");
    const filterBtnDesign = document.getElementById("filter-design");
    const filterBtnArt = document.getElementById("filter-art");
    
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxClose = document.getElementById("lightbox-close");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");

    // Stable hash function for "random" column allocation to maintain visual layout stability
    function getStableColumn(slug) {
        let hash = 0;
        for (let i = 0; i < slug.length; i++) {
            hash = slug.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 3) + 1; // Returns 1, 2, or 3
    }

    // Main loading routine
    async function loadPortfolio() {
        try {
            // Fetch index list of folders
            const response = await fetch("projects.json");
            const projectSlugs = await response.json();
            
            // Load metadata for each project in parallel
            const fetchPromises = projectSlugs.map(async (slug) => {
                try {
                    const metaResponse = await fetch(`projects/${slug}/metadata.json`);
                    const metadata = await metaResponse.json();
                    return { slug, ...metadata };
                } catch (e) {
                    console.error(`Failed to load metadata for: ${slug}`, e);
                    return null;
                }
            });
            
            const loaded = await Promise.all(fetchPromises);
            allProjects = loaded.filter(p => p !== null);
            
            // Initial render
            renderGrid();
            
        } catch (e) {
            console.error("Error loading portfolio projects index:", e);
        }
    }

    // Grid rendering engine with sorting and column distribution
    function renderGrid() {
        // Clear columns
        col1.innerHTML = "";
        col2.innerHTML = "";
        col3.innerHTML = "";
        
        // Filter projects
        const filteredProjects = allProjects.filter(project => {
            if (currentFilter === "all") return true;
            return project.category === currentFilter;
        });

        // Group into lists for columns 1, 2, and 3
        const c1List = [];
        const c2List = [];
        const c3List = [];

        filteredProjects.forEach(project => {
            let col = parseInt(project.column);
            
            // If random or auto-allocated
            if (isNaN(col) || col < 1 || col > 3 || project.column === "random") {
                col = getStableColumn(project.slug);
            }
            
            if (col === 1) c1List.push(project);
            else if (col === 2) c2List.push(project);
            else c3List.push(project);
        });

        // Sort items in each column by their position property (ascending)
        const sortByPosition = (a, b) => {
            const posA = a.position !== undefined ? parseInt(a.position) : 999;
            const posB = b.position !== undefined ? parseInt(b.position) : 999;
            return posA - posB;
        };

        c1List.sort(sortByPosition);
        c2List.sort(sortByPosition);
        c3List.sort(sortByPosition);

        // Render card elements
        renderColumn(c1List, col1);
        renderColumn(c2List, col2);
        renderColumn(c3List, col3);
        
        // Update illustrations queue for lightbox cycling in the active display order
        // Flatten grid items to create the sequential cycle list
        activeIllustrations = [];
        // Interleave or list sequentially? Sequentially is great.
        // Let's grab all active projects with 'art' category
        activeIllustrations = filteredProjects.filter(p => p.category === "art");
        // Sort them for clean cycling
        activeIllustrations.sort(sortByPosition);
    }

    function renderColumn(projectsList, columnElement) {
        projectsList.forEach(project => {
            const card = document.createElement("div");
            card.className = "card-item";
            
            // Check if there are images
            const hasImages = project.images && project.images.length > 0;
            const imageFilename = hasImages ? project.images[0] : "";
            const imagePath = imageFilename ? `projects/${project.slug}/${imageFilename}` : "assets/images/placeholder.jpg";
            
            // Construct inner structure with dimming hover overlay
            card.innerHTML = `
                <img class="card-media" src="${imagePath}" alt="${project.title}" loading="lazy">
                <div class="card-overlay">
                    <h3 class="card-title">${project.title}</h3>
                </div>
            `;
            
            // Setup click events
            card.addEventListener("click", () => {
                if (project.category === "design") {
                    // Navigate to editorial detail page
                    window.location.href = `project.html?id=${project.slug}`;
                } else if (project.category === "art") {
                    // Open optimized Lightbox carousel
                    openLightbox(project.slug);
                }
            });
            
            columnElement.appendChild(card);
        });
    }

    // Lightbox Carousel Logic
    function openLightbox(slug) {
        const idx = activeIllustrations.findIndex(item => item.slug === slug);
        if (idx === -1) return;
        
        currentLightboxIdx = idx;
        updateLightboxContent();
        
        lightbox.style.display = "flex";
        // Force reflow
        lightbox.offsetHeight;
        lightbox.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        document.body.style.overflow = "";
        setTimeout(() => {
            lightbox.style.display = "none";
        }, 300); // Wait for transition
    }

    function updateLightboxContent() {
        if (currentLightboxIdx < 0 || currentLightboxIdx >= activeIllustrations.length) return;
        
        const project = activeIllustrations[currentLightboxIdx];
        const imagePath = `projects/${project.slug}/${project.images[0]}`;
        
        // Smoothly fade image
        lightboxImg.style.opacity = 0;
        
        const tempImg = new Image();
        tempImg.onload = () => {
            lightboxImg.src = imagePath;
            lightboxImg.style.opacity = 1;
            lightboxCaption.textContent = project.title;
        };
        tempImg.src = imagePath;
    }

    function navigateLightbox(dir) {
        if (activeIllustrations.length === 0) return;
        
        currentLightboxIdx += dir;
        if (currentLightboxIdx >= activeIllustrations.length) {
            currentLightboxIdx = 0; // Wrap around to start
        } else if (currentLightboxIdx < 0) {
            currentLightboxIdx = activeIllustrations.length - 1; // Wrap around to end
        }
        
        updateLightboxContent();
    }

    // Event Handlers for Filters
    function setActiveFilter(filter, activeBtn) {
        currentFilter = filter;
        
        // Update active class on buttons
        [filterBtnAll, filterBtnDesign, filterBtnArt].forEach(btn => {
            if (btn) btn.classList.remove("active");
        });
        activeBtn.classList.add("active");
        
        renderGrid();
    }

    if (filterBtnAll) filterBtnAll.addEventListener("click", () => setActiveFilter("all", filterBtnAll));
    if (filterBtnDesign) filterBtnDesign.addEventListener("click", () => setActiveFilter("design", filterBtnDesign));
    if (filterBtnArt) filterBtnArt.addEventListener("click", () => setActiveFilter("art", filterBtnArt));

    // Lightbox Event Listeners
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => navigateLightbox(1));
    
    // Close on clicking overlay background
    if (lightbox) {
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox || e.target === lightbox.querySelector(".lightbox-content")) {
                closeLightbox();
            }
        });
    }

    // Keyboard navigation (arrows + ESC)
    document.addEventListener("keydown", (e) => {
        if (!lightbox.classList.contains("active")) return;
        
        if (e.key === "Escape") {
            closeLightbox();
        } else if (e.key === "ArrowLeft") {
            navigateLightbox(-1);
        } else if (e.key === "ArrowRight") {
            navigateLightbox(1);
        }
    });

    // Start execution
    loadPortfolio();
});
