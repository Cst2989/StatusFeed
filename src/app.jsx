var React = require('react');
var ReactDOM = require('react-dom');
var Appbase = require('appbase-js');

var StuckOnInput = React.createClass({

    // Checks if localstorage already exists otherwise update it with default value
    getInitialState: function () {
    	var self = this
    	var status
    	var twitterHandle

        // Get the Appbase credentials from the config file
        // Note that this will be executed as async process
        $.getJSON("./config.json", function (json) {
            // Create Appbase reference object
            self.appbaseRef = new Appbase({
            	url: 'https://scalr.api.appbase.io',
            	appname: json.appbase.appname,
            	username: json.appbase.username,
            	password: json.appbase.password
            })
            self.type = json.appbase.type
        })

        // If there is twitter handle in localstorage, get it and use that as default
        // Also, get the status from the localstorage to show as the placeholder
        if (localStorage.state) {
        	status = JSON.parse(localStorage.state).status
        	twitterHandle = JSON.parse(localStorage.state).twitterHandle
        }
        // Setting the status with default Value
        else {
        	status = "Mining Bitcoin"
        	twitterHandle = ""
        }
        return {
        	status: status,
        	twitterHandle: twitterHandle
        }
    },
    componentDidUpdate: function(prevProps, prevState) {
    	localStorage.state = JSON.stringify(this.state)
    },
    addInputToAppbase: function(status) {
	    // Set the status state with the argument passed with the function
	    this.setState({
	    	status:status 
	    });
	    var data = {
	    	"status": status,
	    	"twitterHandle": this.state.twitterHandle,
	    	"timestamp": Date.now()
	    }
	    this.appbaseRef.index({
	    	type: this.type,
	    	body: data,
	    }).on('data', function(response) {
	    	console.log(response);
	    }).on('error', function(error) {
	    	console.log(error);
	    })
	},
	setTwitterHandle: function(twitterHandle) {
		this.setState({
			twitterHandle: twitterHandle 
		})
	},
	render: function() {
	    var twitterHandle = ""

	    // If twitterHandle is already set in localStorage, then show update status page directly
	    if (this.state.twitterHandle) {
	        return (<StatusInput onSubmit={this.addInputToAppbase} placeholder={this.state.status}/>)
	    } else {
	        return (<TwitterInput onSubmit={this.setTwitterHandle}/>)
	    }
	}
});
// Component for input of Twitter handle
var TwitterInput = React.createClass({
    componentDidMount: function() {
        // Focus on the input button when the page loads
        this.refs.nameInput.focus()
    },
    _handleKeyPress: function(e) {
        // Call the onSubmit event when enter is pressed
        if (e.key === 'Enter') {
            this.props.onSubmit(this.refs.nameInput.value)
        }
    },
    render: function() {
        return (
            <div className="statusInput">
                <h2>What is your Twitter username?</h2>
                <input type="text" onKeyPress={this._handleKeyPress} placeholder="@YourTwitterUsername" ref="nameInput"/>
            </div>
        )
    }
});

var StatusInput = React.createClass({
    // Focus on the input button when the page loads
    componentDidMount: function() {
        this.refs.statusInput.focus()
    },
    _handleKeyPress: function(e) {
        // Call the onSubmit event when enter is pressed
        if (e.key === 'Enter') {
            this.props.onSubmit(this.refs.statusInput.value)
            this.refs.statusInput.value = ""
        }
    },
    render: function() {
        return (
            < div className = "statusInput" >
                < h2 > I am stuck on </h2>
                < input type = "text" onKeyPress = {this._handleKeyPress} placeholder = { this.props.placeholder } ref = "statusInput" />
            </div>
        )
    }
});

ReactDOM.render(
    <StuckOnInput />, document.getElementById('stuckOnInput')
);


var StuckOnFeed = React.createClass({
    getInitialState: function() {
        var self = this

        // Get the Appbase credentials from the config file
        // Note that this will be executed as async process
        $.getJSON("./config.json", function(json) {
            // Create Appbase reference object
            self.appbaseRef = new Appbase({url: 'https://scalr.api.appbase.io', appname: json.appbase.appname, username: json.appbase.username, password: json.appbase.password})
            self.type = json.appbase.type
            self.pageNumber = 0
            self.feedQuery = {
              type: self.type,
              size: 10,
              from: self.pageNumber*10,
              body: {
                query: {
                    match_all: {}
                },
                sort: {
                    timestamp: "desc"
                }
              }
            }
            self.getHistoricalFeed()
            self.subscribeToUpdates()
        })
        return {items: []}
    },
    getHistoricalFeed: function() {
	    self = this
	    self.appbaseRef.search(self.feedQuery).on('data', function(res) {
	        self.pageNumber = self.pageNumber + 1
	        self.addItemsToFeed(res.hits.hits)
	    }).on('error', function(err) {
	        console.log("search error: ", err)
	    })
	},
// Add the items to the feed (in desc order)
	addItemsToFeed: function(newItems) {
	    var updated = this.state.items
	    $.map(newItems, function(object) {
	        updated.push(object._source)
	    })
	    this.setState({items: updated})
	},
	subscribeToUpdates: function() {
	    self = this
	    self.appbaseRef.searchStream(self.feedQuery).on('data', function(res) {
	        self.addItemToTop(res._source)
	    }).on('error', function(err) {
	        console.log("streaming error: ", err)
	    })
	},
	addItemToTop: function(newItem) {
	    var updated = this.state.items
	    updated.unshift(newItem)
	    this.setState({items: updated})
	},

	handleScroll: function(event) {
	    var body = event.srcElement.body
	    // When the client reaches at the bottom of the page, get next page
	    if (body.clientHeight + body.scrollTop >= body.offsetHeight) {
	        this.getHistoricalFeed()
	    }
	},
	componentWillMount: function() {
	    window.addEventListener('scroll', this.handleScroll)
	},
	componentWillUnmount: function() {
	    window.removeEventListener('scroll', this.handleScroll)
	},
	render: function() {
    return (
        <FeedContainer items={this.state.items}/>
    )
}
});

var FeedContainer = React.createClass({
    render: function() {
        var content
        // Loop through all the items
        if (this.props.items.length > 0) {
          content = this.props.items.map(function(item, i) {
            return <FeedItem item={item} key={i}/>
          })
        } else {
          content = <FeedItem item="No content Available!" />
        }

        return (
            <div className="row">
                <h3 className="col s12 center white-text">Status Feed</h3>
                {content}
            </div>
        )
    }
});
var FeedItem = React.createClass({
    render: function() {
        // Get the profile picture from Twitter using the given handle
        var twitterProfilePictureURL = "https://twitter.com/" + this.props.item.twitterHandle + "/profile_image?size=original"
        return (
            <div className="row">
                <div className="col s4 m2 l1">
                    <img className="profile-picture" src={twitterProfilePictureURL}/>
                </div>
                <div className="col s8 m10 l11">
                    <span className="twitter-handle">{this.props.item.twitterHandle} is stuck on</span>
                    <p className="stuck-on-feed">{this.props.item.status}</p>
                </div>
            </div>
        )
    }
});
ReactDOM.render(
     <StuckOnFeed />,
     document.getElementById('stuckOnFeed')
)