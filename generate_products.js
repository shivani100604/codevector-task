const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

const Product = sequelize.define('Product', {
  uuid: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'products',
  timestamps: false,
});

const categories = ['Electronics', 'Books', 'Home', 'Toys', 'Sports', 'Clothing', 'Health', 'Beauty'];
const adjectives = ['Smart', 'Bright', 'Eco', 'Pro', 'Mini', 'Ultra', 'Quick', 'Fresh', 'Pure', 'Max'];
const nouns = ['Speaker', 'Watch', 'Lamp', 'Bottle', 'Bag', 'Shoe', 'Phone', 'Chair', 'Laptop', 'Camera'];

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

async function main() {
  await sequelize.authenticate();
  await Product.sync({ force: true });

  const total = 200000;
  const chunkSize = 5000;
  const startDate = new Date('2024-01-01T00:00:00Z').getTime();
  const endDate = Date.now();

  for (let offset = 0; offset < total; offset += chunkSize) {
    const batch = [];
    for (let i = 0; i < chunkSize && offset + i < total; i += 1) {
      const idx = offset + i + 1;
      const createdAt = new Date(startDate + Math.floor(Math.random() * (endDate - startDate)));
      const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));
      batch.push({
        uuid: uuidv4(),
        name: `${randItem(adjectives)} ${randItem(nouns)} ${pad(idx, 6)}`,
        category: randItem(categories),
        price: (Math.random() * 200 + 5).toFixed(2),
        createdAt,
        updatedAt,
      });
    }
    await Product.bulkCreate(batch);
    process.stdout.write(`Inserted ${Math.min(offset + chunkSize, total)} / ${total}\r`);
  }
  console.log('\nDone generating products.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
