const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// MySQL connection (without password)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'amazon_scraper'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

// Function to scrape Amazon and store data into MySQL
async function scrapeAmazon() {
  try {
    const url = 'https://www.amazon.com/s?k=laptops'; // Change the URL to the product search page you want
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });

    const $ = cheerio.load(data);
    const products = [];

    $('.s-main-slot .s-result-item').each((i, el) => {
      const title = $(el).find('h2 a span').text().trim();
      const price = $(el).find('.a-price span.a-offscreen').first().text().trim();
      const rating = $(el).find('.a-row span.a-icon-alt').text().trim();
      const url = 'https://www.amazon.com' + $(el).find('h2 a').attr('href');

      if (title && price && url) {
        products.push([title, price, rating, url]);
      }
    });

    // Insert scraped data into MySQL
    const insertQuery = 'INSERT INTO products (title, price, rating, url) VALUES ?';
    db.query(insertQuery, [products], (err, result) => {
      if (err) {
        console.error('Error inserting data into MySQL:', err);
      } else {
        console.log('Data inserted successfully:', result.affectedRows);
      }
    });

  } catch (error) {
    console.error('Error scraping Amazon:', error);
  }
}

// Endpoint to get products from MySQL
app.get('/api/products', (req, res) => {
  const query = 'SELECT * FROM products';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve products' });
    }
    res.json(results);
  });
});

// Start scraping Amazon once
scrapeAmazon().then(() => {
  console.log('Scraping completed.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
