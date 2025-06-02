const API_BASE = "http://localhost:5000";
function showLoading(containerId) {
  document.getElementById(containerId).innerHTML =
    '<div class="loading-container"><div class="spinner"></div></div>';
}
// Load and display statistics
async function loadStats() {
  showLoading("stats-container");
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const stats = await response.json();

    document.getElementById("stats-container").innerHTML = `
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
                    <span class="stat-number">${stats.avg_rating.toFixed(
                      1
                    )}</span>
                    <div>Avg Rating</div>
                </div>
            </div>
        `;
  } catch (error) {
    document.getElementById("stats-container").innerHTML =
      '<div class="error">Error loading stats. Make sure Flask app is running on localhost:5000</div>';
    showToast("Failed to load statistics", "error");
    console.error("Error loading stats:", error);
  }
}

// Load and display popular movies
async function loadPopularMovies() {
  showLoading("movies-container");
  try {
    const response = await fetch(`${API_BASE}/api/movies/popular`);
    const movies = await response.json();

    const moviesHtml = movies
      .map(
        (movie) => `
            <div class="movie-card">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-stats">
                    ${movie.rating_count} ratings • Movie ID: ${movie.movieId}
                </div>
            </div>
        `
      )
      .join("");

    document.getElementById(
      "movies-container"
    ).innerHTML = `<div class="movies-grid">${moviesHtml}</div>`;
  } catch (error) {
    document.getElementById("movies-container").innerHTML =
      '<div class="error">Error loading movies. Make sure Flask app is running on localhost:5000</div>';
    console.error("Error loading movies:", error);
  }
}

// Load data when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadStats();
  loadPopularMovies();
});

let userRatings = {}; // Store user ratings in memory

// Search movies function
async function searchMovies() {
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/movies/search/${encodeURIComponent(query)}`
    );
    const movies = await response.json();

    const resultsHtml = movies
      .map(
        (movie) => `
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
        `
      )
      .join("");

    document.getElementById("search-results").innerHTML = resultsHtml;
  } catch (error) {
    console.error("Error searching movies:", error);
  }
}

// Rate a movie
function rateMovie(movieId, title, rating) {
  userRatings[movieId] = { title, rating };
  showToast(`Rated "${title}" ${rating} stars!`);
  updateUserRatingsDisplay();
  updateUserProfile();

  if (Object.keys(userRatings).length >= 3) {
    document.getElementById("get-recommendations").style.display = "block";
  }
}

// Update display of user ratings
function updateUserRatingsDisplay() {
  const ratingsHtml = Object.entries(userRatings)
    .map(
      ([movieId, data]) => `
        <div class="user-rating">
            <strong>${data.title}</strong> - ${data.rating}★
            <button onclick="removeRating(${movieId})" style="float: right; font-size: 12px;">Remove</button>
        </div>
    `
    )
    .join("");

  document.getElementById("rated-movies").innerHTML = ratingsHtml;
}

// Remove rating
function removeRating(movieId) {
  delete userRatings[movieId];
  updateUserRatingsDisplay();

  if (Object.keys(userRatings).length < 3) {
    document.getElementById("get-recommendations").style.display = "none";
  }
}

// Get recommendations
async function getRecommendations() {
  try {
    const response = await fetch(`${API_BASE}/api/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ratings: userRatings }),
    });

    const recommendations = await response.json();

    const recsHtml = recommendations
      .map(
        (movie) => `
            <div class="movie-card">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-stats">
                    Score: ${movie.score.toFixed(2)} • Genres: ${movie.genres}
                </div>
            </div>
        `
      )
      .join("");

    document.getElementById(
      "recommendations-container"
    ).innerHTML = `<div class="movies-grid">${recsHtml}</div>`;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    document.getElementById("recommendations-container").innerHTML =
      '<div class="error">Error getting recommendations</div>';
  }
}

// Enter key support for search
document.addEventListener("DOMContentLoaded", function () {
  loadStats();
  loadPopularMovies();

  // Add enter key support
  document
    .getElementById("search-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchMovies();
      }
    });
});

// Add to existing script.js

let userProfile = {
  totalRatings: 0,
  averageRating: 0,
  favoriteGenres: {},
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// Enhanced rate movie function with profile analysis
function rateMovie(movieId, title, rating) {
  userRatings[movieId] = { title, rating };
  updateUserRatingsDisplay();
  updateUserProfile();

  // Show recommendations button after 3+ ratings
  if (Object.keys(userRatings).length >= 3) {
    document.getElementById("get-recommendations").style.display = "block";
  }
}

// Update user profile analysis
function updateUserProfile() {
  const ratings = Object.values(userRatings);

  // Basic stats
  userProfile.totalRatings = ratings.length;
  userProfile.averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  // Rating distribution
  userProfile.ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => userProfile.ratingDistribution[r.rating]++);

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
                    <strong>${userProfile.averageRating.toFixed(
                      1
                    )}★</strong><br>
                    Average Rating
                </div>
                <div class="profile-stat">
                    <strong>${userProfile.ratingDistribution[5]}</strong><br>
                    5-Star Movies
                </div>
                <div class="profile-stat">
                    <strong>${(
                      ((userProfile.ratingDistribution[4] +
                        userProfile.ratingDistribution[5]) /
                        userProfile.totalRatings) *
                      100
                    ).toFixed(0)}%</strong><br>
                    Liked (4-5★)
                </div>
            </div>
        </div>
    `;

  // Insert after user ratings
  const existingProfile = document.querySelector(".user-profile");
  if (existingProfile) {
    existingProfile.outerHTML = profileHtml;
  } else {
    document
      .getElementById("user-ratings")
      .insertAdjacentHTML("beforeend", profileHtml);
  }
}

// Enhanced search results with movie details button
async function searchMovies() {
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  try {
    const response = await fetch(
      `${API_BASE}/api/movies/search/${encodeURIComponent(query)}`
    );
    const movies = await response.json();

    const resultsHtml = movies
      .map(
        (movie) => `
            <div class="search-result">
                <div class="movie-info">
                    <strong>${movie.title}</strong>
                    <small>Genres: ${movie.genres}</small>
                </div>
                <div>
                    <button class="movie-detail-btn" onclick="showMovieDetails(${
                      movie.movieId
                    })">Details</button>
                    <div class="rating-buttons">
                        <button class="rating-btn" onclick="rateMovie(${
                          movie.movieId
                        }, '${movie.title.replace(
          /'/g,
          "\\'"
        )}', 1)">1★</button>
                        <button class="rating-btn" onclick="rateMovie(${
                          movie.movieId
                        }, '${movie.title.replace(
          /'/g,
          "\\'"
        )}', 2)">2★</button>
                        <button class="rating-btn" onclick="rateMovie(${
                          movie.movieId
                        }, '${movie.title.replace(
          /'/g,
          "\\'"
        )}', 3)">3★</button>
                        <button class="rating-btn" onclick="rateMovie(${
                          movie.movieId
                        }, '${movie.title.replace(
          /'/g,
          "\\'"
        )}', 4)">4★</button>
                        <button class="rating-btn" onclick="rateMovie(${
                          movie.movieId
                        }, '${movie.title.replace(
          /'/g,
          "\\'"
        )}', 5)">5★</button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    document.getElementById("search-results").innerHTML = resultsHtml;
  } catch (error) {
    console.error("Error searching movies:", error);
  }
}

// Show movie details in modal
async function showMovieDetails(movieId) {
  try {
    const response = await fetch(`${API_BASE}/api/movies/${movieId}/details`);
    const movie = await response.json();

    const genreTags = movie.genres
      .split("|")
      .map((genre) => `<span class="genre-tag">${genre}</span>`)
      .join("");

    const modalContent = `
            <h2>${movie.title}</h2>
            <p><strong>Genres:</strong><br>${genreTags}</p>
            <p><strong>Average Rating:</strong> ${movie.avg_rating.toFixed(
              1
            )}★ (${movie.rating_count} ratings)</p>
            <p><strong>Movie ID:</strong> ${movie.movieId}</p>
            <div style="margin-top: 20px;">
                <strong>Rate this movie:</strong><br>
                <div class="rating-buttons" style="margin-top: 10px;">
                    <button class="rating-btn" onclick="rateMovie(${
                      movie.movieId
                    }, '${movie.title.replace(
      /'/g,
      "\\'"
    )}', 1); closeModal()">1★</button>
                    <button class="rating-btn" onclick="rateMovie(${
                      movie.movieId
                    }, '${movie.title.replace(
      /'/g,
      "\\'"
    )}', 2); closeModal()">2★</button>
                    <button class="rating-btn" onclick="rateMovie(${
                      movie.movieId
                    }, '${movie.title.replace(
      /'/g,
      "\\'"
    )}', 3); closeModal()">3★</button>
                    <button class="rating-btn" onclick="rateMovie(${
                      movie.movieId
                    }, '${movie.title.replace(
      /'/g,
      "\\'"
    )}', 4); closeModal()">4★</button>
                    <button class="rating-btn" onclick="rateMovie(${
                      movie.movieId
                    }, '${movie.title.replace(
      /'/g,
      "\\'"
    )}', 5); closeModal()">5★</button>
                </div>
            </div>
        `;

    document.getElementById("modal-movie-content").innerHTML = modalContent;
    document.getElementById("movieModal").style.display = "block";
  } catch (error) {
    console.error("Error loading movie details:", error);
  }
}

// Close modal
function closeModal() {
  document.getElementById("movieModal").style.display = "none";
}

// Modal event listeners
document.addEventListener("DOMContentLoaded", function () {
  loadStats();
  loadPopularMovies();

  // Enter key support for search
  document
    .getElementById("search-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchMovies();
      }
    });

  // Modal close events
  document.querySelector(".close").onclick = closeModal;
  window.onclick = function (event) {
    const modal = document.getElementById("movieModal");
    if (event.target === modal) {
      closeModal();
    }
  };
});

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

//smooth focus management
document.addEventListener("DOMContentLoaded", function () {
  loadStats();
  loadPopularMovies();

  // Enhanced enter key support with visual feedback
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      this.style.transform = "scale(0.98)";
      setTimeout(() => (this.style.transform = "scale(1)"), 100);
      searchMovies();
    }
  });

  // Focus styles for better accessibility
  searchInput.addEventListener("focus", function () {
    this.style.boxShadow = "0 0 0 3px rgba(0, 123, 255, 0.25)";
  });

  searchInput.addEventListener("blur", function () {
    this.style.boxShadow = "none";
  });

  // Modal close events (existing code)
  document.querySelector(".close").onclick = closeModal;
  window.onclick = function (event) {
    const modal = document.getElementById("movieModal");
    if (event.target === modal) {
      closeModal();
    }
  };
});

// Hybrid recommendation button
async function getHybridRecommendations() {
    try {
        const response = await fetch(`${API_BASE}/api/recommendations/hybrid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ratings: userRatings })
        });
        
        const recommendations = await response.json();
        displayRecommendations(recommendations, 'hybrid');
        showToast('Hybrid recommendations loaded!');
    } catch (error) {
        console.error('Error getting hybrid recommendations:', error);
    }
}

// Enhanced user profile with analytics
function updateUserProfile() {
    const ratings = Object.values(userRatings);
    if (ratings.length === 0) return;

    // Calculate advanced metrics
    userProfile.totalRatings = ratings.length;
    userProfile.averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    // Genre analysis
    const genrePreferences = analyzeGenrePreferences();
    
    // Rating patterns
    const ratingTrends = analyzeRatingTrends();
    
    // Display enhanced analytics
    displayAdvancedAnalytics(genrePreferences, ratingTrends);
    
    // Show analytics section after 5+ ratings
    if (ratings.length >= 5) {
        document.getElementById('analytics-section').style.display = 'block';
        createRatingChart();
    }
}

function analyzeGenrePreferences() {
    const genreScores = {};
    
    Object.values(userRatings).forEach(rating => {
        // This would require storing genre info with ratings
        // Simplified version for now
        const score = rating.rating;
        // Add genre analysis logic here
    });
    
    return genreScores;
}

function createRatingChart() {
    const ctx = document.getElementById('ratingChart').getContext('2d');
    const distribution = userProfile.ratingDistribution;
    
    // Simple canvas chart (or integrate Chart.js)
    ctx.fillStyle = '#007bff';
    Object.keys(distribution).forEach((rating, index) => {
        const height = distribution[rating] * 20;
        ctx.fillRect(index * 60 + 50, 150 - height, 40, height);
        ctx.fillText(`${rating}★`, index * 60 + 60, 170);
        ctx.fillText(distribution[rating], index * 60 + 65, 140 - height);
    });
}

// Add to movie details modal
async function showMovieDetails(movieId) {
    
    // Add similar movies section
    const similarMovies = await getSimilarMovies(movieId);
    if (similarMovies.length > 0) {
        modalContent += `
            <div style="margin-top: 20px;">
                <h3>🎬 Movies Like This</h3>
                <div class="similar-movies-grid">
                    ${similarMovies.map(movie => `
                        <div class="similar-movie" onclick="showMovieDetails(${movie.movieId})">
                            <strong>${movie.title}</strong><br>
                            <small>${movie.avg_rating.toFixed(1)}★ • ${movie.common_genres} common genres</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
}

async function getSimilarMovies(movieId) {
    try {
        const response = await fetch(`${API_BASE}/api/movies/${movieId}/similar`);
        return await response.json();
    } catch (error) {
        console.error('Error loading similar movies:', error);
        return [];
    }
}

// Modify the getRecommendations function
async function getRecommendations() {
    const container = document.getElementById("recommendations-container");
    container.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Finding your perfect movies...</p></div>';
    
    try {
      const response = await fetch(`${API_BASE}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: userRatings }),
      });
  
      const recommendations = await response.json();
    } catch (error) {
      container.innerHTML = '<div class="error">Error getting recommendations</div>';
      console.error("Error getting recommendations:", error);
    }
  }