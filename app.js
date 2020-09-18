var AsyncLock = require('async-lock');
var lock = new AsyncLock();

const Sequelize = require('sequelize');
const express = require('express')
const app = express()
const port = 3000

const sequelize = new Sequelize('concurrency_test', 'postgres', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  pool: {
    max: 100, // if this is not set, gatling will fail when set to 100 requests / second
    min: 0
  }
});

const Count = sequelize.define('Count', {
  // attributes
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER
  },
  value: {
    type: Sequelize.BIGINT
  }
}, {});

app.get('/', async (req, res) => {
  const count = await Count.findOne({
    where: {
      id: 1
    }
  });
  res.send(`${JSON.stringify(count)}`)
})

app.get('/add', async (req, res) => {
  // this is called an "optimistic" lock, that doesn't actually lock the full table
  const transaction = await sequelize.transaction();
  try {
    const update = await Count.update({
      value: Sequelize.literal("\"value\" + 1")
    }, {
      where: {
        id: 1,  // set other assumptions here
      }
    }, { transaction });

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.send("error");
  }
})

// transaction is useless here, multiple updates will update on the same read value
app.get('/naiveAdd', async (req, res) => {
  const { value } = await Count.findOne();
  const newValue = parseInt(value, 10) + 1;
  const transaction = await sequelize.transaction();
  try {
    await Count.update({
      value: newValue
    }, {
      where: {
        id: 1,  // set other assumptions here
      }
    }, { transaction });

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.send("error");
  }
})

// using advisory lock
app.get('/lockAdd', async (req, res) => {
  try {
    const lockId = 123;

    const transaction = await sequelize.transaction();
    await sequelize.query("SELECT pg_advisory_xact_lock(:lockId)", {
      transaction,
      replacements: { lockId },
      type: Sequelize.QueryTypes.SELECT, // is this for the SELECT raw statement?
      raw: true
    })
    const { value } = await Count.findOne({
      transaction
    });
    const newValue = parseInt(value, 10) + 1;
    await Count.update({
      value: newValue
    }, {
      where: {
        id: 1
      }
    }, { transaction });

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.send("error");
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
