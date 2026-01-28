/**
 * El Paso Verse - Community Features
 * Firebase integration for film idea submissions, voting, and community interaction
 */

// Current filters
let currentFilters = {
    sort: 'popular',
    genre: 'all',
    status: 'all',
    search: ''
};

// User's support tracking
let userSupports = new Set();

/**
 * Load and display all film ideas
 */
async function loadIdeas() {
    const grid = document.getElementById('ideasGrid');
    if (!grid) return;

    try {
        // Check if Firebase is initialized
        if (!db || db === null) {
            console.log('Running in demo mode - showing sample ideas');
            // Show demo data instead
            const demoIdeas = [
                {
                    id: 'demo-sombra',
                    title: 'Sombra de Lobo',
                    logline: 'A man called El Lobo follows a pull only the desert understands.',
                    description: 'Sombra de Lobo follows a wounded gunman who survives a fall into the desert night and awakens changed — a man known now only as El Lobo. Drawn by a silent pull he cannot name, he crosses ravines, riverbeds, and forgotten trails toward Sombrajo, a town whispered of but rarely seen. There, his past shadows him, his future tests him, and the desert reveals what kind of man he truly is.',
                    genre: 'Mystery',
                    submitter: 'Ryan Wiik',
                    imageUrl: 'assets/sombra-concept.png',
                    supportCount: 127,
                    supportGoal: 1000,
                    status: 'gathering',
                    submittedDate: new Date()
                },
                {
                    id: 'demo-breakwater',
                    title: 'The Founding of Breakwater',
                    logline: 'A town rises from rumors in the desert — but can it survive the forces that seek to destroy it?',
                    description: 'Chronicle the birth of Breakwater through the eyes of its first settlers, as they face harsh elements, internal conflicts, and mysterious forces that seem determined to prevent the town from ever existing.',
                    genre: 'Western',
                    submitter: 'Pioneer Community',
                    imageUrl: 'assets/brownsville-reference.jpg',
                    supportCount: 342,
                    supportGoal: 1000,
                    status: 'gathering',
                    submittedDate: new Date()
                }
            ];

            // Apply filters
            let filtered = filterIdeas(demoIdeas);

            // Update stats
            updateStatsFromIdeas(demoIdeas);

            // Display demo ideas
            displayIdeas(filtered, grid);
            return;
        }

        grid.innerHTML = '<div class="loading-message">Loading film ideas...</div>';

        // Load ideas from Firestore
        const ideasSnapshot = await db.collection('filmIdeas').get();

        if (ideasSnapshot.empty) {
            grid.innerHTML = '<div class="empty-state">No film ideas yet. Be the first to submit!</div>';
            updateStats(0, 0, 0);
            return;
        }

        // Convert to array and filter
        let ideas = [];
        ideasSnapshot.forEach(doc => {
            ideas.push({ id: doc.id, ...doc.data() });
        });

        // Load user's supports
        loadUserSupports();

        // Apply filters
        ideas = filterIdeas(ideas);

        // Update stats
        updateStatsFromIdeas(ideas);

        // Display ideas
        displayIdeas(ideas, grid);

    } catch (error) {
        console.error('Error loading ideas:', error);
        grid.innerHTML = '<div class="loading-message">Error loading ideas. Please refresh the page.</div>';
    }
}

/**
 * Filter ideas based on current filters
 */
function filterIdeas(ideas) {
    let filtered = [...ideas];

    // Search filter
    if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        filtered = filtered.filter(idea =>
            idea.title.toLowerCase().includes(searchLower) ||
            idea.logline.toLowerCase().includes(searchLower) ||
            idea.description.toLowerCase().includes(searchLower)
        );
    }

    // Genre filter
    if (currentFilters.genre !== 'all') {
        filtered = filtered.filter(idea => idea.genre === currentFilters.genre);
    }

    // Status filter
    if (currentFilters.status !== 'all') {
        filtered = filtered.filter(idea => idea.status === currentFilters.status);
    }

    // Sort
    switch (currentFilters.sort) {
        case 'popular':
            filtered.sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0));
            break;
        case 'recent':
            filtered.sort((a, b) => {
                const dateA = a.submittedDate?.toDate?.() || new Date(0);
                const dateB = b.submittedDate?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
            break;
        case 'closest':
            filtered.sort((a, b) => {
                const percentA = ((a.supportCount || 0) / (a.supportGoal || 1000)) * 100;
                const percentB = ((b.supportCount || 0) / (b.supportGoal || 1000)) * 100;
                return percentB - percentA;
            });
            break;
    }

    return filtered;
}

/**
 * Display ideas in the grid
 */
function displayIdeas(ideas, grid) {
    if (ideas.length === 0) {
        grid.innerHTML = '<div class="empty-state">No ideas match your filters.</div>';
        return;
    }

    grid.innerHTML = '';

    ideas.forEach(idea => {
        const card = createIdeaCard(idea);
        grid.appendChild(card);
    });
}

/**
 * Create idea card element
 */
function createIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.onclick = () => showIdeaDetail(idea);

    const supportCount = idea.supportCount || 0;
    const supportGoal = idea.supportGoal || 1000;
    const progressPercent = Math.min((supportCount / supportGoal) * 100, 100);
    const status = idea.status || 'gathering';
    const isSupported = userSupports.has(idea.id);

    card.innerHTML = `
        ${idea.imageUrl ?
            `<img src="${idea.imageUrl}" alt="${idea.title}" class="idea-card-image">` :
            `<div class="idea-card-image placeholder">★</div>`
        }
        <div class="idea-card-header">
            <h3 class="idea-card-title">${escapeHtml(idea.title)}</h3>
            <div class="idea-card-meta">
                <span class="status-badge ${status}">${getStatusLabel(status)}</span>
                <span>${escapeHtml(idea.genre || 'Western')}</span>
            </div>
        </div>
        <p class="idea-card-logline">"${escapeHtml(idea.logline)}"</p>
        <div class="idea-card-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="progress-text">
                <span class="support-count">${supportCount}</span> / ${supportGoal} supporters
                ${isSupported ? ' • <span style="color: #C9A961;">★ Supported</span>' : ''}
            </div>
        </div>
    `;

    return card;
}

/**
 * Show idea detail modal (for now, just alert - can be enhanced with modal)
 */
function showIdeaDetail(idea) {
    const supportCount = idea.supportCount || 0;
    const supportGoal = idea.supportGoal || 1000;
    const isSupported = userSupports.has(idea.id);

    const detail = `
Title: ${idea.title}
Genre: ${idea.genre}
Status: ${getStatusLabel(idea.status)}
By: ${idea.submitter}

Logline: ${idea.logline}

Description:
${idea.description}

Support: ${supportCount} / ${supportGoal} supporters
${isSupported ? '(You support this idea)' : ''}
    `.trim();

    if (confirm(detail + '\n\n' + (isSupported ? 'Remove your support?' : 'Support this idea?'))) {
        supportIdea(idea.id);
    }
}

/**
 * Support/unsupport an idea
 */
async function supportIdea(ideaId) {
    if (!db) {
        // Demo mode - toggle support locally
        if (userSupports.has(ideaId)) {
            userSupports.delete(ideaId);
            alert('Support removed (Demo mode - not saved)');
        } else {
            userSupports.add(ideaId);
            alert('Idea supported! (Demo mode - not saved)');
        }
        loadIdeas(); // Refresh to show updated state
        return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
        alert('Unable to identify user. Please log out and log back in.');
        return;
    }

    try {
        const ideaRef = db.collection('filmIdeas').doc(ideaId);
        const ideaDoc = await ideaRef.get();

        if (!ideaDoc.exists) {
            alert('Idea not found.');
            return;
        }

        const idea = ideaDoc.data();
        const supporters = idea.supporters || [];
        const isCurrentlySupported = supporters.includes(userId);

        if (isCurrentlySupported) {
            // Remove support
            await ideaRef.update({
                supporters: firebase.firestore.FieldValue.arrayRemove(userId),
                supportCount: firebase.firestore.FieldValue.increment(-1)
            });
            userSupports.delete(ideaId);
            localStorage.setItem('userSupports', JSON.stringify([...userSupports]));
        } else {
            // Add support
            await ideaRef.update({
                supporters: firebase.firestore.FieldValue.arrayUnion(userId),
                supportCount: firebase.firestore.FieldValue.increment(1)
            });
            userSupports.add(ideaId);
            localStorage.setItem('userSupports', JSON.stringify([...userSupports]));
        }

        // Reload ideas
        loadIdeas();

    } catch (error) {
        console.error('Error supporting idea:', error);
        alert('Error updating support. Please try again.');
    }
}

/**
 * Submit a new film idea
 */
async function submitNewIdea(event) {
    event.preventDefault();

    if (!db) {
        alert('Firebase not configured. Please set up Firebase first.');
        return;
    }

    const userId = getCurrentUserId();
    const submitterName = document.getElementById('submitterName').value;

    // Save submitter name for future use
    if (submitterName) {
        setUserDisplayName(submitterName);
    }

    const ideaData = {
        title: document.getElementById('ideaTitle').value,
        logline: document.getElementById('ideaLogline').value,
        description: document.getElementById('ideaDescription').value,
        genre: document.getElementById('ideaGenre').value,
        submitter: submitterName,
        submitterId: userId,
        submittedDate: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'gathering',
        supportCount: 0,
        supportGoal: 1000,
        supporters: [],
        imageUrl: null
    };

    try {
        // Handle image upload if provided
        const imageFile = document.getElementById('ideaImage').files[0];
        if (imageFile) {
            if (imageFile.size > 2 * 1024 * 1024) {
                alert('Image file too large. Maximum size is 2MB.');
                return;
            }

            const storageRef = storage.ref();
            const imageRef = storageRef.child(`ideas/${Date.now()}_${imageFile.name}`);
            await imageRef.put(imageFile);
            ideaData.imageUrl = await imageRef.getDownloadURL();
        }

        // Add to Firestore
        await db.collection('filmIdeas').add(ideaData);

        // Show success message
        document.getElementById('submitIdeaForm').style.display = 'none';
        document.getElementById('submitSuccess').style.display = 'block';

        // Reset form after delay
        setTimeout(() => {
            document.getElementById('submitIdeaForm').reset();
            document.getElementById('submitIdeaForm').style.display = 'block';
            document.getElementById('submitSuccess').style.display = 'none';

            // Switch to browse tab
            document.querySelector('[data-tab="browse"]').click();
            loadIdeas();
        }, 3000);

    } catch (error) {
        console.error('Error submitting idea:', error);
        alert('Error submitting your idea. Please try again.');
    }
}

/**
 * Update statistics display
 */
function updateStatsFromIdeas(ideas) {
    const totalIdeas = ideas.length;
    const totalSupport = ideas.reduce((sum, idea) => sum + (idea.supportCount || 0), 0);
    const greenlitCount = ideas.filter(idea =>
        idea.status === 'greenlit' || idea.status === 'production' || idea.status === 'released'
    ).length;

    console.log('Stats:', { totalIdeas, totalSupport, greenlitCount });
    updateStats(totalIdeas, totalSupport, greenlitCount);
}

function updateStats(totalIdeas, totalSupport, greenlitCount) {
    const totalIdeasEl = document.getElementById('totalIdeas');
    const totalSupportEl = document.getElementById('totalSupport');
    const greenlitCountEl = document.getElementById('greenlitCount');

    if (totalIdeasEl) totalIdeasEl.textContent = totalIdeas;
    if (totalSupportEl) totalSupportEl.textContent = totalSupport;
    if (greenlitCountEl) greenlitCountEl.textContent = greenlitCount;
}

/**
 * Load user's supported ideas from localStorage
 */
function loadUserSupports() {
    const stored = localStorage.getItem('userSupports');
    if (stored) {
        try {
            userSupports = new Set(JSON.parse(stored));
        } catch (e) {
            userSupports = new Set();
        }
    }
}

/**
 * Get status label
 */
function getStatusLabel(status) {
    const labels = {
        gathering: 'Gathering Support',
        review: 'Under Review',
        greenlit: 'Greenlit',
        production: 'In Production',
        released: 'Released'
    };
    return labels[status] || 'Gathering Support';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load exclusive content
 */
async function loadExclusiveContent() {
    const container = document.getElementById('exclusiveContent');
    if (!container || !db) return;

    try {
        const contentSnapshot = await db.collection('exclusiveContent')
            .orderBy('publishedDate', 'desc')
            .get();

        if (contentSnapshot.empty) {
            container.innerHTML = '<div class="empty-state">No exclusive content available yet. Check back soon!</div>';
            return;
        }

        container.innerHTML = '';

        contentSnapshot.forEach(doc => {
            const content = doc.data();
            const item = document.createElement('div');
            item.className = 'content-item';
            item.innerHTML = `
                <div class="content-type">${content.type || 'update'}</div>
                <h4>${escapeHtml(content.title)}</h4>
                <p>${escapeHtml(content.description)}</p>
                ${content.content ? `<a href="${content.content}" class="content-link" target="_blank">View Content →</a>` : ''}
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading exclusive content:', error);
        container.innerHTML = '<div class="loading-message">Error loading content.</div>';
    }
}

/**
 * Initialize filters
 */
function initializeFilters() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');
    const genreFilter = document.getElementById('genreFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentFilters.search = this.value;
            loadIdeas();
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', function() {
            currentFilters.sort = this.value;
            loadIdeas();
        });
    }

    if (genreFilter) {
        genreFilter.addEventListener('change', function() {
            currentFilters.genre = this.value;
            loadIdeas();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilters.status = this.value;
            loadIdeas();
        });
    }
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only run on members page
    if (window.location.pathname.includes('members.html')) {
        initializeFilters();
        loadIdeas();

        // Set up form submission
        const submitForm = document.getElementById('submitIdeaForm');
        if (submitForm) {
            submitForm.addEventListener('submit', submitNewIdea);
        }

        // Load exclusive content when tab is clicked
        const exclusiveTab = document.querySelector('[data-tab="exclusive"]');
        if (exclusiveTab) {
            exclusiveTab.addEventListener('click', function() {
                if (db && document.getElementById('exclusiveContent').innerHTML.includes('Loading')) {
                    loadExclusiveContent();
                }
            });
        }
    }
});
