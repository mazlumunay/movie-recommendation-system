import pandas as pd
import os

class MovieDataLoader:
    def __init__(self, data_path='../data/ml-latest-small/'):
        self.data_path = data_path
        
    def load_movies(self):
        """Load movies dataset"""
        return pd.read_csv(os.path.join(self.data_path, 'movies.csv'))
    
    def load_ratings(self):
        """Load ratings dataset"""  
        return pd.read_csv(os.path.join(self.data_path, 'ratings.csv'))
    
    def load_tags(self):
        """Load tags dataset"""
        return pd.read_csv(os.path.join(self.data_path, 'tags.csv'))
    
    def get_basic_stats(self):
        """Get basic dataset statistics"""
        movies = self.load_movies()
        ratings = self.load_ratings()
        
        stats = {
            'total_movies': len(movies),
            'total_ratings': len(ratings),
            'unique_users': ratings.userId.nunique(),
            'avg_rating': ratings.rating.mean()
        }
        return stats

# Test the loader
if __name__ == "__main__":
    loader = MovieDataLoader()
    stats = loader.get_basic_stats()
    print("Dataset Stats:", stats)