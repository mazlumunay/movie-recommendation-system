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
    


    # Add new endpoints

@app.route('/api/movies/<int:movie_id>/details')
def get_movie_details(movie_id):
    """Get detailed information about a specific movie"""
    try:
        movies = loader.load_movies()
        ratings = loader.load_ratings()
        
        movie = movies[movies['movieId'] == movie_id]
        if movie.empty:
            return jsonify({"error": "Movie not found"}), 404
        
        movie_data = movie.iloc[0]
        movie_ratings = ratings[ratings['movieId'] == movie_id]
        
        details = {
            'movieId': int(movie_data['movieId']),
            'title': movie_data['title'],
            'genres': movie_data['genres'],
            'avg_rating': float(movie_ratings['rating'].mean()) if not movie_ratings.empty else 0,
            'rating_count': len(movie_ratings)
        }
        
        return jsonify(details)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommendations/collaborative', methods=['POST'])
def get_collaborative_recommendations():
    """Get recommendations using collaborative filtering"""
    try:
        user_data = request.json
        user_ratings = user_data.get('ratings', {})
        
        if len(user_ratings) < 3:
            return jsonify({"error": "Need at least 3 ratings"}), 400
        
        movies = loader.load_movies()
        ratings = loader.load_ratings()
        
        # Create user-movie matrix
        user_movie_matrix = ratings.pivot_table(
            index='userId', 
            columns='movieId', 
            values='rating'
        ).fillna(0)
        
        # Create current user vector
        user_vector = pd.Series(0, index=user_movie_matrix.columns)
        for movie_id, rating_data in user_ratings.items():
            if int(movie_id) in user_vector.index:
                user_vector[int(movie_id)] = rating_data['rating']
        
        # Find similar users using cosine similarity
        user_similarities = []
        for idx, existing_user in user_movie_matrix.iterrows():
            # Only compare with users who have rated similar movies
            common_movies = (user_vector > 0) & (existing_user > 0)
            if common_movies.sum() >= 2:  # At least 2 movies in common
                similarity = cosine_similarity(
                    user_vector.values.reshape(1, -1),
                    existing_user.values.reshape(1, -1)
                )[0][0]
                user_similarities.append((idx, similarity))
        
        # Sort by similarity and get top 10 similar users
        user_similarities.sort(key=lambda x: x[1], reverse=True)
        top_similar_users = [user_id for user_id, _ in user_similarities[:10]]
        
        # Get recommendations from similar users
        similar_user_ratings = ratings[ratings['userId'].isin(top_similar_users)]
        
        # Exclude movies already rated by current user
        rated_movie_ids = [int(mid) for mid in user_ratings.keys()]
        candidate_movies = similar_user_ratings[
            ~similar_user_ratings['movieId'].isin(rated_movie_ids)
        ]
        
        # Calculate average ratings for candidate movies
        movie_scores = candidate_movies.groupby('movieId').agg({
            'rating': ['mean', 'count']
        }).reset_index()
        
        movie_scores.columns = ['movieId', 'avg_rating', 'rating_count']
        
        # Only recommend movies with at least 3 ratings from similar users
        movie_scores = movie_scores[movie_scores['rating_count'] >= 3]
        
        # Merge with movie titles and genres
        recommendations = movie_scores.merge(movies, on='movieId')
        recommendations = recommendations.sort_values('avg_rating', ascending=False).head(10)
        
        result = []
        for _, row in recommendations.iterrows():
            result.append({
                'movieId': int(row['movieId']),
                'title': row['title'],
                'genres': row['genres'],
                'score': float(row['avg_rating']),
                'similar_user_ratings': int(row['rating_count'])
            })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500