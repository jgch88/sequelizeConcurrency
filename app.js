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

// this is called an "optimistic" lock, that doesn't actually lock the full table
app.get('/optimisticLockAdd', async (req, res) => {
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
    res.status(500).send("error");
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
    res.status(500).send("error");
  }
})

// using advisory lock, more like a mutex lock
app.get('/lockAdd', async (req, res) => {
  try {
    const lockId = 123;

    const transaction = await sequelize.transaction();
    await sequelize.query("SELECT pg_advisory_xact_lock(:lockId)", {
      transaction,
      replacements: { lockId },
      type: Sequelize.QueryTypes.SELECT, // this is for the raw query SELECT statement
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
    res.status(500).send("error");
  }
})

// select for update lock
// requires repeatable read or serializable isolation, so that "in transit" updates don't get lost
// don't require the "lock" in the update, just need it in the findAll
// cons: rollbacks happen
app.get('/sfulockAdd', async (req, res) => {
  // https://sequelize.org/master/manual/transactions.html#isolation-levels
  // https://www.geeksforgeeks.org/transaction-isolation-levels-dbms
  // https://vladmihalcea.com/a-beginners-guide-to-database-locking-and-the-lost-update-phenomena/
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  });
  try {
    const count = await Count.findAll({
      where: {
        id: 1,
      },
      lock: transaction.LOCK.update,
      transaction
    });
    
    const newValue = parseInt(count[0].value, 10) + 1;

    console.log("newValue", newValue);
    // cannot use Count.update, need the count[0] row locked by findAll above
    await count[0].update({
      value: newValue
    }, { 
      transaction 
    });

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.status(500).send("error");
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
