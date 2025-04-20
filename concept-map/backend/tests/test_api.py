import json
import unittest
from app import app
from concept_map_generation.crud_routes import concept_maps


class ConceptMapAPITestCase(unittest.TestCase):
    """Test case for the concept map API."""

    def setUp(self):
        """Set up test client and other test variables."""
        app.testing = True
        self.client = app.test_client()
        # Reset in-memory storage for each test
        concept_maps.clear()

    def test_health_check(self):
        """Test API can return a health check response (GET request)."""
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['status'], 'healthy')
        
    def test_create_concept_map(self):
        """Test API can create a concept map (POST request)."""
        test_map = {
            'name': 'Test Map',
            'nodes': [{'id': 1, 'label': 'Concept 1', 'position': {'x': 100, 'y': 100}}],
            'edges': []
        }
        res = self.client.post(
            '/api/concept-maps/',
            data=json.dumps(test_map),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data['name'], 'Test Map')
        self.assertEqual(len(data['nodes']), 1)
        self.assertEqual(data['id'], 1)

    def test_get_all_concept_maps(self):
        """Test API can get all concept maps (GET request)."""
        # Create a test map first
        test_map = {'name': 'Test Map'}
        self.client.post(
            '/api/concept-maps/',
            data=json.dumps(test_map),
            content_type='application/json'
        )
        
        # Now get all maps
        res = self.client.get('/api/concept-maps/')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)

    def test_get_specific_concept_map(self):
        """Test API can get a specific concept map by ID (GET request)."""
        # Create a test map first
        test_map = {'name': 'Test Map'}
        res = self.client.post(
            '/api/concept-maps/',
            data=json.dumps(test_map),
            content_type='application/json'
        )
        map_id = json.loads(res.data)['id']
        
        # Now get the specific map
        res = self.client.get(f'/api/concept-maps/{map_id}/')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['name'], 'Test Map')
        self.assertEqual(data['id'], map_id)

    def test_update_concept_map(self):
        """Test API can update a specific concept map (PUT request)."""
        # Create a test map first
        test_map = {'name': 'Test Map'}
        res = self.client.post(
            '/api/concept-maps/',
            data=json.dumps(test_map),
            content_type='application/json'
        )
        map_id = json.loads(res.data)['id']
        
        # Now update the map
        updated_map = {
            'name': 'Updated Map',
            'nodes': [{'id': 1, 'label': 'New Concept', 'position': {'x': 200, 'y': 200}}]
        }
        res = self.client.put(
            f'/api/concept-maps/{map_id}/',
            data=json.dumps(updated_map),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['name'], 'Updated Map')
        self.assertEqual(len(data['nodes']), 1)
        self.assertEqual(data['nodes'][0]['label'], 'New Concept')

    def test_delete_concept_map(self):
        """Test API can delete a specific concept map (DELETE request)."""
        # Create a test map first
        test_map = {'name': 'Test Map'}
        res = self.client.post(
            '/api/concept-maps/',
            data=json.dumps(test_map),
            content_type='application/json'
        )
        map_id = json.loads(res.data)['id']
        
        # Now delete the map
        res = self.client.delete(f'/api/concept-maps/{map_id}/')
        self.assertEqual(res.status_code, 200)
        
        # Verify it's deleted
        res = self.client.get(f'/api/concept-maps/{map_id}/')
        self.assertEqual(res.status_code, 404)

if __name__ == '__main__':
    unittest.main() 