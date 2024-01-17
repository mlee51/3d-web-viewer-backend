const express = require('express')
const multer = require('multer')
const cors = require('cors')
var fs = require('fs');
var http = require('http');
var https = require('https');
// var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
// var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const { Pool } = require('pg')
const app = express()

const file = fs.readFileSync('./93DAB2C3E2180E089CE9DD54F4C0908F.txt')

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/.well-known/pki-validation/93DAB2C3E2180E089CE9DD54F4C0908F.txt', (req, res) => {
    res.sendFile('93DAB2C3E2180E089CE9DD54F4C0908F.txt', { root: __dirname });
});

const pool = new Pool({
    user: "postgres",
    host: "database-1.cfuiw0agkw4c.us-east-2.rds.amazonaws.com",
    database: "postgres",
    password: "Newlake929!",
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
})

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/upload', upload.single('model'), async (req, res) => {
    const modelName = req.body.name
    const modelData = req.file.buffer
    try {
        await pool.query('INSERT INTO models (name, data) VALUES ($1, $2)', [modelName, modelData])
        res.status(201).json({ message: 'Model uploaded successfully' })
    } catch (error) {
        if (error.code === '23505') { // PostgreSQL unique_violation error code
            res.status(400).json({ error: 'Model with this name already exists' });
        } else {
            console.error('Error uploading model:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
})

app.post('/update/:modelName', async (req, res) => {
    const modelName = req.params.modelName
    const backgroundColor = req.body.backgroundColor
    console.log(req.body)
    try {
        await pool.query('UPDATE models SET background_color = $2 WHERE name = $1', [modelName, backgroundColor])
        res.status(201).json({ message: 'Model updated successfully' })
    } catch (error) {
        console.error('Error updating model:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.get('/models/:modelName', async (req, res) => {
    const modelName = req.params.modelName
    const result = await pool.query('SELECT data FROM models WHERE name = $1', [modelName])
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Model not found' })
    }
    const modelData = result.rows[0].data
    // console.log(modelName)
    res.send(modelData)
})

app.get('/background_color/:modelName', async (req, res) => {
    const modelName = req.params.modelName
    const result = await pool.query('SELECT background_color FROM models WHERE name = $1', [modelName])
    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Model not found' })
    }
    const background_color = result.rows[0]
    res.json(background_color)
})

app.get('/models', async (req, res) => {
    try {
        const availableModels = await fetchAvailableModels()
        res.json(availableModels)
    } catch (error) {
        console.error('Error fetching available models:', error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.get('/testdb', async (req, res) => {
    try {
        const client = await pool.connect();
        res.status(200).json({ message: 'Database connection successful' });
        client.release();
    } catch (error) {
        console.error('Error connecting to database: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(3001, async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the database');

        // You can add any additional setup or log messages here

        client.release();
    } catch (error) {
        console.error('Error connecting to database: ', error);
    }

    console.log('Server running on port 3001');
});


async function fetchAvailableModels() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT name FROM models')
        const availableModels = result.rows.map((row) => row.name)
        client.release()
        return availableModels
    } catch (error) {
        console.error('Error fetching models from database: ', error)
        throw error
    }
}