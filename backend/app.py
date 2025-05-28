from flask import Flask, jsonify
from flask_cors import CORS
from data_loader import MovieDataLoader
from flask import request
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd  

app = Flask(__name__)
CORS(app)

loader = MovieDataLoader()

@app.route('/')
def home():
    return jsonify({"message": "Movie Recommendation API", "status": "running"})

@app.route('/api/stats')
def get_stats():
    """Get basic dataset statistics"""
    stats = loader.get_basic_stats()
    return jsonify(stats)

@app.route('/api/movies/popular')
def get_popular_movies():
    """Get top 10 most rated movies"""
    movies = loader.load_movies()
    ratings = loader.load_ratings()
    
    # Count ratings per movie
    movie_counts = ratings.groupby('movieId').size().reset_index(name='rating_count')
    
    # Merge with movie titles and get top 10
    popular = movie_counts.merge(movies, on='movieId') \
                         .sort_values('rating_count', ascending=False) \
                         .head(10)
    
    return jsonify(popular[['movieId', 'title', 'rating_count']].to_dict('records'))

if __name__ == '__main__':
    app.run(debug=True)


@app.route('/api/movies/search/<query>')
def search_movies(query):
    """Search movies by title"""
    movies = loader.load_movies()
    
    # Simple case-insensitive search
    matching = movies[movies['title'].str.contains(query, case=False, na=False)]
    
    # Return top 10 matches
    results = matching.head(10)[['movieId', 'title', 'genres']].to_dict('records')
    return jsonify(results)


# Add this new endpoint
@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """Get movie recommendations based on user ratings"""
    try:
        user_data = request.json
        user_ratings = user_data.get('ratings', {})
        
        if len(user_ratings) < 3:
            return jsonify({"error": "Need at least 3 ratings"}), 400
        
        # Load data
        movies = loader.load_movies()
        ratings = loader.load_ratings()
        
        # Simple content-based recommendation
        # Get genres of liked movies (4+ stars)
        liked_movie_ids = [int(mid) for mid, data in user_ratings.items() if data['rating'] >= 4]
        
        if not liked_movie_ids:
            # If no high ratings, use all rated movies
            liked_movie_ids = [int(mid) for mid in user_ratings.keys()]
        
        # Get genres of liked movies
        liked_movies = movies[movies['movieId'].isin(liked_movie_ids)]
        liked_genres = set()
        for genres_str in liked_movies['genres'].dropna():
            liked_genres.update(genres_str.split('|'))
        
        # Find movies with similar genres that user hasn't rated
        unrated_movies = movies[~movies['movieId'].isin([int(mid) for mid in user_ratings.keys()])]
        
        recommendations = []
        for _, movie in unrated_movies.iterrows():
            if pd.isna(movie['genres']):
                continue
                
            movie_genres = set(movie['genres'].split('|'))
            genre_overlap = len(liked_genres.intersection(movie_genres))
            
            if genre_overlap > 0:
                # Get average rating for this movie
                movie_ratings = ratings[ratings['movieId'] == movie['movieId']]
                if len(movie_ratings) >= 5:  # Only recommend movies with at least 5 ratings
                    avg_rating = movie_ratings['rating'].mean()
                    score = genre_overlap * avg_rating  # Simple scoring
                    
                    recommendations.append({
                        'movieId': int(movie['movieId']),
                        'title': movie['title'],
                        'genres': movie['genres'],
                        'score': score,
                        'avg_rating': avg_rating
                    })
        
        # Sort by score and return top 10
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return jsonify(recommendations[:10])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500