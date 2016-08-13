# SQLRel

SQLRel is a fork to the SQLElectron project that supports graph visualizations using Cytoscape.js

Using it is simple:
In the SQL query, you must have properties

- **node1** - id of node1
- **node2** - id of node2

This will create node1, node2 and a connection between them.
Example:
```sql
(SELECT 1 node1, 2 node2)
UNION ALL
(SELECT 3 node1, 4 node2)
UNION ALL
(SELECT 2 node1, 3 node2)
```
![example](https://cloud.githubusercontent.com/assets/1146117/17644843/3150d3a2-619b-11e6-9247-7bae70527004.png)




Development
```
# first shell window
npm run dev:webpack

# second shell window
npm run dev:electron
```
