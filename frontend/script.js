const API_BASE = 'http://localhost:5000';

// Load and display statistics
async function loadStats() {
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