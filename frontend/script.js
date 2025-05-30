const API_BASE = 'http://localhost:5000';
function showLoading(containerId) {
    document.getElementById(containerId).innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';
}
// Load and display statistics
async function loadStats() {
    showLoading('stats-container');
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        const stats = await response.json();
        
        document.getElementById('stats-container').innerHTML = `
            <div class="stats">
                <div class="stat-card">
                    <span class="stat-number">${stats.total_movies.toLocaleString()}</span>
                    <div>Movies</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.total_ratings.toLocaleString()}</span>
                    <div>Ratings</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.unique_users}</span>
                    <div>Users</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.avg_rating.toFixed(1)}</span>
                    <div>Avg Rating</div>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('stats-container').innerHTML = 
            '<div class="error">Error loading stats. Make sure Flask app is running on localhost:5000</div>';
        console.error('Error loading stats:', error);
    }
}

// Load and display popular movies
async function loadPopularMovies() {
    showLoading('movies-container');
    try {
        const response = await fetch(`${API_BASE}/api/movies/popular`);
        const movies = await response.json();
        
        const moviesHtml = movies.map(movie => `
            <div class="movie-card">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-stats">
                    ${movie.rating_count} ratings • Movie ID: ${movie.movieId}
                </div>
            </div>
        `).join('');
        
        document.getElementById('movies-container').innerHTML = 
            `<div class="movies-grid">${moviesHtml}</div>`;
    } catch (error) {
        document.getElementById('movies-container').innerHTML = 
            '<div class="error">Error loading movies. Make sure Flask app is running on localhost:5000</div>';
        console.error('Error loading movies:', error);
    }
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadPopularMovies();
});


let userRatings = {}; // Store user ratings in memory

// Search movies function
async function searchMovies() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/movies/search/${encodeURIComponent(query)}`);
        const movies = await response.json();
        
        const resultsHtml = movies.map(movie => `
            <div class="search-result">
                <div>
                    <strong>${movie.title}</strong><br>
                    <small>Genres: ${movie.genres}</small>
                </div>
                <div class="rating-buttons">
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title}', 1)">1★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title}', 2)">2★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title}', 3)">3★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title}', 4)">4★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title}', 5)">5★</button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('search-results').innerHTML = resultsHtml;
    } catch (error) {
        console.error('Error searching movies:', error);
    }
}

// Rate a movie
function rateMovie(movieId, title, rating) {
    userRatings[movieId] = { title, rating };
    updateUserRatingsDisplay();
    
    // Show recommendations button after 3+ ratings
    if (Object.keys(userRatings).length >= 3) {
        document.getElementById('get-recommendations').style.display = 'block';
    }
}

// Update display of user ratings
function updateUserRatingsDisplay() {
    const ratingsHtml = Object.entries(userRatings).map(([movieId, data]) => `
        <div class="user-rating">
            <strong>${data.title}</strong> - ${data.rating}★
            <button onclick="removeRating(${movieId})" style="float: right; font-size: 12px;">Remove</button>
        </div>
    `).join('');
    
    document.getElementById('rated-movies').innerHTML = ratingsHtml;
}

// Remove rating
function removeRating(movieId) {
    delete userRatings[movieId];
    updateUserRatingsDisplay();
    
    if (Object.keys(userRatings).length < 3) {
        document.getElementById('get-recommendations').style.display = 'none';
    }
}

// Get recommendations
async function getRecommendations() {
    try {
        const response = await fetch(`${API_BASE}/api/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ratings: userRatings })
        });
        
        const recommendations = await response.json();
        
        const recsHtml = recommendations.map(movie => `
            <div class="movie-card">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-stats">
                    Score: ${movie.score.toFixed(2)} • Genres: ${movie.genres}
                </div>
            </div>
        `).join('');
        
        document.getElementById('recommendations-container').innerHTML = 
            `<div class="movies-grid">${recsHtml}</div>`;
    } catch (error) {
        console.error('Error getting recommendations:', error);
        document.getElementById('recommendations-container').innerHTML = 
            '<div class="error">Error getting recommendations</div>';
    }
}

// Enter key support for search
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadPopularMovies();
    
    // Add enter key support
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });
});


// Add to existing script.js

let userProfile = {
    totalRatings: 0,
    averageRating: 0,
    favoriteGenres: {},
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
};

// Enhanced rate movie function with profile analysis
function rateMovie(movieId, title, rating) {
    userRatings[movieId] = { title, rating };
    updateUserRatingsDisplay();
    updateUserProfile();
    
    // Show recommendations button after 3+ ratings
    if (Object.keys(userRatings).length >= 3) {
        document.getElementById('get-recommendations').style.display = 'block';
    }
}

// Update user profile analysis
function updateUserProfile() {
    const ratings = Object.values(userRatings);
    
    // Basic stats
    userProfile.totalRatings = ratings.length;
    userProfile.averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    // Rating distribution
    userProfile.ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => userProfile.ratingDistribution[r.rating]++);
    
    displayUserProfile();
}

// Display user profile
function displayUserProfile() {
    if (userProfile.totalRatings === 0) return;
    
    const profileHtml = `
        <div class="user-profile">
            <h3>📊 Your Movie Profile</h3>
            <div class="profile-stats">
                <div class="profile-stat">
                    <strong>${userProfile.totalRatings}</strong><br>
                    Movies Rated
                </div>
                <div class="profile-stat">
                    <strong>${userProfile.averageRating.toFixed(1)}★</strong><br>
                    Average Rating
                </div>
                <div class="profile-stat">
                    <strong>${userProfile.ratingDistribution[5]}</strong><br>
                    5-Star Movies
                </div>
                <div class="profile-stat">
                    <strong>${((userProfile.ratingDistribution[4] + userProfile.ratingDistribution[5]) / userProfile.totalRatings * 100).toFixed(0)}%</strong><br>
                    Liked (4-5★)
                </div>
            </div>
        </div>
    `;
    
    // Insert after user ratings
    const existingProfile = document.querySelector('.user-profile');
    if (existingProfile) {
        existingProfile.outerHTML = profileHtml;
    } else {
        document.getElementById('user-ratings').insertAdjacentHTML('beforeend', profileHtml);
    }
}

// Enhanced search results with movie details button
async function searchMovies() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/movies/search/${encodeURIComponent(query)}`);
        const movies = await response.json();
        
        const resultsHtml = movies.map(movie => `
            <div class="search-result">
                <div class="movie-info">
                    <strong>${movie.title}</strong>
                    <small>Genres: ${movie.genres}</small>
                </div>
                <div>
                    <button class="movie-detail-btn" onclick="showMovieDetails(${movie.movieId})">Details</button>
                    <div class="rating-buttons">
                        <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 1)">1★</button>
                        <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 2)">2★</button>
                        <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 3)">3★</button>
                        <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 4)">4★</button>
                        <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 5)">5★</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('search-results').innerHTML = resultsHtml;
    } catch (error) {
        console.error('Error searching movies:', error);
    }
}

// Show movie details in modal
async function showMovieDetails(movieId) {
    try {
        const response = await fetch(`${API_BASE}/api/movies/${movieId}/details`);
        const movie = await response.json();
        
        const genreTags = movie.genres.split('|').map(genre => 
            `<span class="genre-tag">${genre}</span>`
        ).join('');
        
        const modalContent = `
            <h2>${movie.title}</h2>
            <p><strong>Genres:</strong><br>${genreTags}</p>
            <p><strong>Average Rating:</strong> ${movie.avg_rating.toFixed(1)}★ (${movie.rating_count} ratings)</p>
            <p><strong>Movie ID:</strong> ${movie.movieId}</p>
            <div style="margin-top: 20px;">
                <strong>Rate this movie:</strong><br>
                <div class="rating-buttons" style="margin-top: 10px;">
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 1); closeModal()">1★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 2); closeModal()">2★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 3); closeModal()">3★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 4); closeModal()">4★</button>
                    <button class="rating-btn" onclick="rateMovie(${movie.movieId}, '${movie.title.replace(/'/g, "\\'")}', 5); closeModal()">5★</button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-movie-content').innerHTML = modalContent;
        document.getElementById('movieModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading movie details:', error);
    }
}

// Close modal
function closeModal() {
    document.getElementById('movieModal').style.display = 'none';
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadPopularMovies();
    
    // Enter key support for search
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMovies();
        }
    });
    
    // Modal close events
    document.querySelector('.close').onclick = closeModal;
    window.onclick = function(event) {
        const modal = document.getElementById('movieModal');
        if (event.target === modal) {
            closeModal();
        }
    }
});

