const express = require('express');
const { Client, Databases, Query } = require('appwrite'); // Import Query from Appwrite SDK

const app = express();
const port = 3000;

// Configure Appwrite Client
const client = new Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your Appwrite server endpoint
  .setProject('6766c96500252cb91aa4'); // Replace with your actual project ID

const databases = new Databases(client);
const databaseId = '6766c9ea002a69ed19fe'; // Your database ID
const collectionId = '6766ca02003df5419c7e'; // Your collection ID

// Set EJS as view engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

// Home Page Route (with dynamic categories)
app.get('/', async (req, res) => {
    try {
      // Fetch all products
      const productsResponse = await databases.listDocuments(databaseId, collectionId);
      const products = productsResponse.documents;
  
      // Reverse the hierarchy: Subcategory -> Parent Category
      const categoryGroups = {};
      products.forEach(product => {
        const subCategory = product.category || 'Uncategorized';
        if (!categoryGroups[subCategory]) {
          categoryGroups[subCategory] = new Set();
        }
        categoryGroups[subCategory].add(product.category1);
      });
  
      // Convert Sets to Arrays
      Object.keys(categoryGroups).forEach(subCategory => {
        categoryGroups[subCategory] = Array.from(categoryGroups[subCategory]);
      });
  
      res.render('home', { products, categoryGroups }); // Pass products and grouped categories
    } catch (error) {
      console.error('Error fetching data:', error.message);
      res.status(500).send('Error fetching data.');
    }
  });
  

// Search Route
app.get('/search', async (req, res) => {
  try {
    // Capture and normalize the search query
    const searchQuery = req.query.query?.trim().toLowerCase();

    if (!searchQuery) {
      // Render empty results if search query is empty
      res.render('search', { products: [] });
      return;
    }

    console.log('Search Query (lowercase):', searchQuery);

    const results = new Set();

    // Fields to search
    const searchableFields = ['description', 'category', 'city', 'title', 'category1'];

    // Perform searches for each field
    for (const field of searchableFields) {
      const response = await databases.listDocuments(databaseId, collectionId, [
        Query.search(field, searchQuery),
      ]);
      response.documents.forEach(doc => results.add(JSON.stringify(doc)));
    }

    // Convert Set back to array of unique objects
    const products = Array.from(results).map(doc => JSON.parse(doc));

    res.render('search', { products }); // Render `search.ejs`
  } catch (error) {
    console.error('Error during search:', error.message);
    res.status(500).send('Error during search: ' + error.message);
  }
});

// Subcategory Filter Route
app.get('/category/:categoryOrSubcategory', async (req, res) => {
  try {
    const categoryOrSubcategory = req.params.categoryOrSubcategory; // Get clicked category or subcategory
    console.log('Clicked Category or Subcategory:', categoryOrSubcategory);

    // Query products by `category` (parent) and `category1` (child)
    const categoryResponse = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('category', categoryOrSubcategory), // Match parent category
    ]);

    const subcategoryResponse = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('category1', categoryOrSubcategory), // Match subcategory
    ]);

    // Combine the results from both queries
    const products = [...categoryResponse.documents, ...subcategoryResponse.documents];
    console.log('Filtered Products:', products);

    // Fetch all products to generate the sidebar
    const allProductsResponse = await databases.listDocuments(databaseId, collectionId);
    const allProducts = allProductsResponse.documents;

    const categoryGroups = {};
    allProducts.forEach(product => {
      const parentCategory = product.category || 'Uncategorized'; // Parent category
      if (!categoryGroups[parentCategory]) {
        categoryGroups[parentCategory] = new Set();
      }
      categoryGroups[parentCategory].add(product.category1); // Subcategories
    });

    // Convert sets to arrays for rendering
    Object.keys(categoryGroups).forEach(parentCategory => {
      categoryGroups[parentCategory] = Array.from(categoryGroups[parentCategory]);
    });

    res.render('home', { products, categoryGroups }); // Render filtered products with sidebar
  } catch (error) {
    console.error('Error fetching category:', error.message);
    res.status(500).send(`Error fetching category: ${error.message}`);
  }
});
  
  
  

// Product Details Route
app.get('/product/:ad_no', async (req, res) => {
  try {
    const adNo = req.params.ad_no; // Capture `ad_no` from the URL
    console.log('Fetching product with ad_no:', adNo);

    // Fetch product using the `ad_no` filter
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('ad_no', adNo),
    ]);

    if (response.documents.length === 0) {
      // If no product is found, render a 404 page or show an error message
      res.status(404).send('Product not found.');
      return;
    }

    const product = response.documents[0]; // Get the first matching product
    res.render('detail', { product }); // Pass `product` to `detail.ejs`
  } catch (error) {
    console.error('Error fetching product details:', error.message);
    res.status(500).send('Error fetching product details.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
