- manually added a row to Count table with { id: 1, value: 1 }

Notes
Managed vs Unmanaged transactions
`https://stackoverflow.com/questions/42870374/node-js-7-how-to-use-sequelize-transaction-with-async-await`

`Deadlocks should not happen if all concurrent clients are pure inserters`

https://www.postgresql.org/docs/9.1/explicit-locking.html
https://sequelize.org/master/manual/transactions.html

https://makandracards.com/makandra/31937-differences-between-transactions-and-locking
`This means that your code needs to deal with concurrent data access. The two main tools we use to cope with concurrency are database transactions and distributed locks. These two are not interchangeable. You can't use a transaction when you need a lock. You can't use a lock when you need a transaction.`

https://github.com/sequelize/sequelize/issues/8196
