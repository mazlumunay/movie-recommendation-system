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