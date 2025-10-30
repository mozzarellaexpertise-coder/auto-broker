const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'cars.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');

// --- Middleware Setup ---
// 1. CORS: Allows your Vue app (usually on port 5173) to talk to the API (port 3000)
app.use(cors());
// 2. Static Files: Allows the browser to fetch images using the /public path
app.use('/public', express.static(path.join(__dirname, 'public')));
// 3. Ensure uploads directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- Multer Configuration for File Upload ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Create a unique filename using timestamp
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage }).single('carPhoto');

// --- Data Utility Functions ---
function readCars() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeCars(cars) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cars, null, 4));
}

function getNextId(cars) {
    return cars.reduce((max, car) => Math.max(max, car.id || 0), 0) + 1;
}

// --- API Endpoints ---

// GET /cars: Read all cars
app.get('/cars', (req, res) => {
    const cars = readCars();
    res.json(cars);
});

// POST /add-car: Add a new car with file upload
app.post('/add-car', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: 'File upload error: ' + err.message });
        }

        const { make, model, year, price } = req.body;
        
        if (!make || !model || !year || !price) {
            return res.status(400).json({ error: 'Missing required car details.' });
        }

        const cars = readCars();
        const newCar = {
            id: getNextId(cars),
            make,
            model,
            year: parseInt(year),
            price: parseInt(price),
            // The path used for display is relative to the API's public folder
            imageUrl: req.file ? `/public/uploads/${req.file.filename}` : null
        };

        cars.push(newCar);
        writeCars(cars);

        res.status(201).json({ message: 'Car added successfully', car: newCar });
    });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Node.js API listening on port ${PORT}`);
});