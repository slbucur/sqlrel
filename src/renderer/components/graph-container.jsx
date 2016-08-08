import React,{Component} from 'react';
import cytoscape from 'cytoscape';


export default class GraphContainer extends React.Component{


  getCyElements(){

    var rows = this.props.results[0].rows;

    function rowToRel(row){
      var rel = { data: { source: row['node1'], target: row['node2'] } };
      var nodes = [
        { data: { id: row['node1'] } },
        { data: { id: row['node2'] } },
      ];
      for(var key in row){
        if(key.includes('1')){
          var itemKey = key.replace('1', '');
          nodes[0]['data'][itemKey] = row[key];
        }
        if(key.includes('2')){
          var itemKey = key = key.replace('2', '');
          nodes[1]['data'][itemKey] = row[key];
        }
      }
      return [nodes[0], nodes[1], rel];
    }
    return rows.map(rowToRel).reduce((prev, curr) => prev.concat(curr), []);
  }

  renderCytoscapeElement(){
    var elements;
    if(this.props.results){
      elements = this.getCyElements()
    }
    else{
      elements = {
        nodes: [
          { data: { id: 'cat' } },
          { data: { id: 'bird' } },
          { data: { id: 'ladybug' } },
          { data: { id: 'aphid' } },
          { data: { id: 'rose' } },
          { data: { id: 'grasshopper' } },
          { data: { id: 'plant' } },
          { data: { id: 'wheat' } }
        ],
          edges: [
        { data: { source: 'cat', target: 'bird' } },
        { data: { source: 'bird', target: 'ladybug' } },
        { data: { source: 'bird', target: 'grasshopper' } },
        { data: { source: 'grasshopper', target: 'plant' } },
        { data: { source: 'grasshopper', target: 'wheat' } },
        { data: { source: 'ladybug', target: 'aphid' } },
        { data: { source: 'aphid', target: 'rose' } }
      ]
      }
    }

    console.log(elements);
    console.log('* Cytoscape.js is rendering the graph..');

    this.cy = cytoscape(
      {
        container: document.getElementById('cy'),

        boxSelectionEnabled: false,
        autounselectify: true,

        style: cytoscape.stylesheet()
          .selector('node')
          .css({
            'height': 80,
            'width': 80,
            'background-fit': 'cover',
            'border-color': '#000',
            'border-width': 3,
            'border-opacity': 0.5,
            'content': 'data(name)',
            'text-valign': 'center',
          })
          .selector('edge')
          .css({
            'width': 6,
            'target-arrow-shape': 'triangle',
            'line-color': '#ffaaaa',
            'target-arrow-color': '#ffaaaa',
            'curve-style': 'bezier'
          })
        ,
        elements: elements,

        layout: {
          name: 'cose',
          directed: true,
          padding: 10
        }
      });
  }

  componentDidUpdate(){
    if(this.updateCy){
      this.cy.destroy();
      this.renderCytoscapeElement();
    }
  }

  componentDidMount(){
    this.setState({'loaded': true});
    this.renderCytoscapeElement();
  }

  shouldComponentUpdate(nextProps) {
    return (
      (!nextProps.isExecuting && this.props.isExecuting) ||
      (nextProps.query !== this.props.query) ||
      (nextProps.copied && !this.props.copied)
    );
  }

  render(){
    if(this.props.results){
      console.log("Damn, I need to update");
      this.updateCy = true;
    }
    return(
      <div className="node_selected">
        <div id="cy" style={{height: this.props.height * 2}}/>
      </div>
    )
  }
}
