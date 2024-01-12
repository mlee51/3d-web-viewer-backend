const express = require('express')
const multer = require('multer')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const pool = new Pool({
    user: 'postgres',
    host: 'database-1.cfuiw0agkw4c.us-east-2.rds.amazonaws.com',
    database: 'postgres',
    password: 'Newlake929!',
    port: 5432,
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

app.listen(3001, () => {
    console.log('Server running on port 3001')
})

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