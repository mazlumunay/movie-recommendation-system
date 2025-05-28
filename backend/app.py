from flask import Flask, jsonify
from flask_cors import CORS
from data_loader import MovieDataLoader

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