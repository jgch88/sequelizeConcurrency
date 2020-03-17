var AsyncLock = require('async-lock');
var lock = new AsyncLock();

const Sequelize = require('sequelize');
const express = require('express')
const app = express()
const port = 3000

const sequelize = new Sequelize('concurrency_test', 'postgres', 'password', {
  host: 'localhost',
  dialect: 'postgres'
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

// Count.create({
//   value: 1
// });

let counter = 0;

app.get('/', async (req, res) => {
  const count = await Count.findOne({
    where: {
      id: 1
    }
  });
  res.send(`${JSON.stringify(count)}`)
})

app.get('/add', async (req, res) => {
  let transaction;
  try {
    // trying to make db lock so that other requests cannot "read" it, but it's still reading
    transaction = await sequelize.transaction({
      lock: Sequelize.Transaction.LOCK.UPDATE
    });

    counter += 1;
    console.log(`incrementing counter to ${counter}`)

    console.log(`*********** finding Count`)
    const count = await Count.findOne({
      where: {
        id: 1
      }
    }, { transaction });
    
    console.log(`## ${count} ##`)
    const newValue = parseInt(count.value) + 1;

    if (counter !== newValue) {
      // this request is being spammed too fast, rollback
      throw new Error(`out of sync ${counter} vs ${newValue}`);
    }

    console.log(`*********** updating Count`)
    const update = await Count.update({
      value: newValue
    }, {
      where: {
        id: 1
      }
    }, { transaction })
    const message = `new value ${newValue}, count: ${counter}, update: ${update}`;
    console.log(message);

    console.log(`*********** comitting transaction ${transaction}`)
    await transaction.commit();
    res.send(message);
  } catch (e) {
    if (transaction) {
      console.log(`*********** rolling back transaction ${transaction}, error: ${e}`)
      await transaction.rollback();
    }
    res.send("error");
  }

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
