Setup
- Run sequelize db migration
- Manually added a row to Count table with { id: 1, value: 1 }

node app.js

Need to get the gatling-charts-highcharts-bundle to run the test
https://gatling.io/open-source/start-testing/
Copy BasicSimulation.scala into ${gatling-dir}/user-files/simulations/computer-database

Run Gatling
./${gatling-dir}/bin/gatling.sh (choose the BasicSimulation)

Sequelize connection pool needs to be increased if multiple transactions are trying to be committed

Notes
Managed vs Unmanaged transactions
`https://stackoverflow.com/questions/42870374/node-js-7-how-to-use-sequelize-transaction-with-async-await`

`Deadlocks should not happen if all concurrent clients are pure inserters`

https://www.postgresql.org/docs/9.1/explicit-locking.html
https://sequelize.org/master/manual/transactions.html

https://makandracards.com/makandra/31937-differences-between-transactions-and-locking
`This means that your code needs to deal with concurrent data access. The two main tools we use to cope with concurrency are database transactions and distributed locks. These two are not interchangeable. You can't use a transaction when you need a lock. You can't use a lock when you need a transaction.`

https://github.com/sequelize/sequelize/issues/8196


Additional comments
make sure that the value has not changed that depends on what where condition we apply for the update statement, it is basically optimistic lock, when do the update, adding a where clause to make sure the assumption still holds. Using this we can make sure the points does not deduct to become a negative number or making sure the session slots not being overbooked, without the need to use a explicit lock, like select ... for update

Readings:
https://rclayton.silvrback.com/distributed-locking-with-postgres-advisory-locks
https://vladmihalcea.com/a-beginners-guide-to-database-locking-and-the-lost-update-phenomena/
https://dsinecos.github.io/blog/Debugging-ResourceRequest-Timed-Out-Error-In-Sequelize
https://sequelize.org/master/manual/transactions.html#isolation-levels
https://www.geeksforgeeks.org/transaction-isolation-levels-dbms
