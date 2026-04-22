const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const invoiceRoutes = require('./routes/invoice');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.get('/api/ping', (req, res) => res.status(200).send('pong'));
app.use('/api', invoiceRoutes);

// Error Handling block
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
