'use strict';

var mqtt = require('mqtt');
var React = require('react');
var ReactDOM = require('react-dom');
var {LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, ResponsiveContainer} = require('recharts');

class Subscription extends React.PureComponent {
  render() {
    return <h1>Subscription {this.props.topic}</h1>;
  }
}

class SubscriptionList extends React.PureComponent {
  render() {
    return (<ul>{this.props.topics.map((topic) => React.createElement(Subscription, {topic}, null))}</ul>);
  }
}

class TemperaturePlot extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
    this.props.client.subscribe(this.props.topic);
    // this.props.client.onMessageArrived((msg) => {
    //   console.log(msg);
    // });
    this.props.client.on('message', (topic, message) => {
      if(topic == this.props.topic) {
        this.setState((prevState, props) => {
          return {data: prevState.data.concat([{timestamp: Date.now(), value: message}])};
        });
      }
    });
  }

  render() {
    if(this.state.data.length > 0) {
      return (
        <ResponsiveContainer>
          <LineChart data={this.state.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="timestamp"/>
            <YAxis domain={['dataMin - 5', 'dataMax + 5']}/>
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip/>
            <Legend/>
            <Line type="monotone" dataKey="value" stroke="#333" />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return null;
  }
}

var client = mqtt.connect("ws://localhost:1884");
client.on('connect', () => {
  ReactDOM.render(
    <TemperaturePlot topic="home/bedroom/temperature" client={client} />,
    document.getElementById("root")
  )
});

client.subscribe('home/bedroom/temperature', () => console.log(arguments));
client.on('message', (topic, message) => console.log(arguments));

window.client = client;

// var client = new Paho.MQTT.Client("127.0.0.1", 1884, "dashboard");
// client.onConnectionLost = (err) => console.error(err);
// client.onMessageArrived = (msg) => console.log(msg);

// client.connect({onSuccess: () => {
//   ReactDOM.render(
//     <TemperaturePlot topic="home/bedroom/temperature" client={client} />,
//     document.getElementById("root")
//   )
// }});
