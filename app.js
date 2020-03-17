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

app.get('/', async (req, res) => {
  const count = await Count.findOne({
    where: {
      id: 1
    }
  });
  res.send(`${JSON.stringify(count)}`)
})

app.get('/add', async (req, res) => {
  const count = await Count.findOne({
    where: {
      id: 1
    }
  });
  
  const newValue = parseInt(count.value) + 1;

  Count.update({
    value: newValue
  }, {
    where: {
      id: 1
    }
  })
  res.send(`new value ${newValue}`)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
