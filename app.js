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
    // https://github.com/sequelize/sequelize/blob/master/src/dialects/abstract/connection-manager.js
    // default value is 5
    max: 5, // if this is not set, gatling will fail when set to 100 requests / second for optimistic / advisory locks
    min: 0,
    acquire: 40000
  }
});

const Count = sequelize.define('Count', {
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
  try {
    const count = await Count.findOne({
      where: {
        id: 1
      }
    });
    const newValue = parseInt(count.value, 10) + 1
    console.log(newValue);
    await Count.update({
      value: newValue
    }, {
      where: {
        id: 1
      }
    })
    
    res.send("message");
  } catch (e) {
    res.status(500).send("error");
  }
})

// transaction is useless here, multiple updates will update on the same read value
// still have "lost updates"
app.get('/naiveAdd', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const count = await Count.findAll({
      where: {
        id: 1
      },
      transaction
    });
    const newValue = parseInt(count[0].value, 10) + 1
    console.log(newValue);
    await count[0].update({
      value: newValue
    }, { transaction })

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.status(500).send("error");
  }
})

// select for update lock
// pros: can set connection pool size to max 5, and it still works, presumably because requests to db are queued
// cons: rollbacks happen
app.get('/sfulockAdd', async (req, res) => {
  const transaction = await sequelize.transaction();
  // const transaction = await sequelize.transaction({
  //   isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  // });
  try {
    const count = await Count.findAll({
      where: {
        id: 1,
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    const newValue = parseInt(count[0].value, 10) + 1;
    console.log("newValue", newValue);
    // cannot use Count.update, need the count[0] row locked by findAll above
    await count[0].update({
      value: newValue
    }, { transaction })

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.status(500).send("error");
  }
})

// this is called an "optimistic" lock, that doesn't actually lock the full table
// con: fails on connection pool size of 5, timeout presumably due to concurrent access of db choking
app.get('/optimisticLockAdd', async (req, res) => {
  const transaction = await sequelize.transaction(); // still doesn't work with 5 connection pool but repeatable_read
  try {
    const count = await Count.findAll({
      where: {
        id: 1,
      },
      transaction
    });
    console.log(count[0].value);
    const [ updatedRows ] = await Count.update({
      value: Sequelize.literal("\"value\" + 1")
    }, {
      where: {
        id: 1,  
        value: count[0].value // only update if count value hasn't changed since the query above
      }
    }, { transaction });
    console.log("updatedRows", updatedRows)

    await transaction.commit();
    res.send("message");
  } catch (e) {
    console.log("error", JSON.stringify(e))
    await transaction.rollback();
    res.status(500).send("error");
  }
})

// using advisory lock, more like a mutex lock
// con: fails on connection pool size of 5, timeout presumably due to concurrent access of db choking
app.get('/lockAdd', async (req, res) => {
  try {
    const lockId = 123;

    const transaction = await sequelize.transaction(); // also doesn't work with 5 connection pool but repeatable_read
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
        id: 1 // set other assumptions here
      }
    }, { transaction });

    await transaction.commit();
    res.send("message");
  } catch (e) {
    await transaction.rollback();
    res.status(500).send("error");
  }
})

// when combined with say a inprogress unique constraint, it also reduces chance of error

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
