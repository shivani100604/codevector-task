const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

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
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
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
  indexes: [
    { fields: ['updatedAt', 'id'] },
    { fields: ['category', 'updatedAt', 'id'] },
  ],
});

function encodeCursor(updatedAt, id) {
  return Buffer.from(JSON.stringify({ updatedAt, id })).toString('base64');
}

function decodeCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || !parsed.updatedAt || typeof parsed.id !== 'number') {
      return null;
    }
    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }
    return { updatedAt, id: parsed.id };
  } catch (err) {
    return null;
  }
}

async function initDatabase() {
  await sequelize.authenticate();
  await Product.sync();
}

app.get('/products', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const category = req.query.category;
    const rawCursor = req.query.cursor;
    const decodedCursor = rawCursor ? decodeCursor(rawCursor) : null;

    if (rawCursor && !decodedCursor) {
      return res.status(400).json({ error: 'Invalid cursor' });
    }

    const where = {};
    if (category) {
      where.category = category;
    }

    if (decodedCursor) {
      where[Op.or] = [
        { updatedAt: { [Op.lt]: decodedCursor.updatedAt } },
        {
          updatedAt: decodedCursor.updatedAt,
          id: { [Op.lt]: decodedCursor.id },
        },
      ];
    }

    const products = await Product.findAll({
      where,
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: limit + 1,
    });

    const hasMore = products.length > limit;
    const pageItems = hasMore ? products.slice(0, limit) : products;
    const lastItem = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor(lastItem.updatedAt.toISOString(), lastItem.id)
      : null;

    res.json({
      data: pageItems,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      order: [[sequelize.col('category'), 'ASC']],
    });
    res.json(categories.map((row) => row.category));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });
