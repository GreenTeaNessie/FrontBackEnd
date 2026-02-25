const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let products = [
  { id: 1, name: 'Студия, 29 м2, Мурино', cost: 5200000 },
  { id: 2, name: '2-комнатная квартира, 68 м2, Теплый Стан', cost: 15400000 },
  { id: 3, name: 'Дом, 140 м2, Подмосковье', cost: 21900000 }
];

app.get('/',(req, res)=>{
  res.send('Главная страница');
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id == req.params.id);

  if (!product) {
    return res.status(404).send('Товар не найден');
  }

  res.json(product);
});

app.post('/products', (req, res) => {
  const { name, cost } = req.body;

  const newProduct = {
    id: Date.now(),
    name,
    cost
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.patch('/products/:id', (req, res) => {
  const product = products.find((p) => p.id == req.params.id);

  if (!product) {
    return res.status(404).send('Товар не найден');
  }

  const { name, cost } = req.body;

  if (name !== undefined) {
    product.name = name;
  }

  if (cost !== undefined) {
    product.cost = cost;
  }

  res.json(product);
});

app.delete('/products/:id', (req, res) => {
  products = products.filter((p) => p.id != req.params.id);
  res.send('Ok');
});

app.use((req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
