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
  const t = await sequelize.transaction();

  try {

    
    counter += 1;
    console.log(`incrementing counter to ${counter}`)

    const count = await Count.findOne({
      where: {
        id: 1
      }
    }, { transaction: t });
    
    const newValue = parseInt(count.value) + 1;

    await Count.update({
      value: newValue
    }, {
      where: {
        id: 1
      }
    }, { transaction: t })
    const message = `new value ${newValue}, count: ${counter}`;
    console.log(message);
    
    await t.commit();
    res.send(message);
  } catch (e) {
    await t.rollback();
    res.send('error');
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
