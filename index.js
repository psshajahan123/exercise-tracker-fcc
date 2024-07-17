const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

//* Middleware

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

//* Schemas

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

//* Models

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

//* Endpoints

/*
 * GET
 * Delete all users
 */
app.get('/api/users/delete', function (_req, res) {
	console.log('### delete all users ###'.toLocaleUpperCase());

	User.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all users failed!',
			});
		}

		res.json({ message: 'All users have been deleted!', result: result });
	});
});

/*
 * GET
 * Delete all exercises
 */
app.get('/api/exercises/delete', function (_req, res) {
	console.log('### delete all exercises ###'.toLocaleUpperCase());

	Exercise.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all exercises failed!',
			});
		}

		res.json({ message: 'All exercises have been deleted!', result: result });
	});
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

/*
 * GET
 * Get all users
 */
app.get('/api/users', async function (_req, res) {

  try {
    const allUsers = await User.find({})

    res.json(allUsers)
  } catch (err) {
    console.log(err)
  }

	/*User.find({}, function (err, users) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Getting all users failed!',
			});
		}

		if (users.length === 0) {
			res.json({ message: 'There are no users in the database!' });
		}

		res.json(users);
	});*/
});

/*
 * POST
 * Create a new user
 */
app.post('/api/users', function (req, res) {
  try {
    const inputUsername = req.body.username;
	  let newUser = new User({ username: inputUsername });
	  res.json(newUser)

  } catch (err) {
    console.log(err)
  }
});

/*
 * POST
 * Add a new exercise
 * @param _id
 */
app.post('/api/users/:_id/exercises', async function (req, res) {
	let userId = req.params._id;
	let description = req.body.description;
	let duration = req.body.duration;
	let date = req.body.date;

	//? Check for date
	if (!date) {
		date = new Date().toISOString().substring(0, 10);
	}

  try {
    const userInDB = await User.findById(userId)

    let newExercise = new Exercise({
			_id: userInDB._id,
			username: userInDB.username,
			description: description,
			duration: parseInt(duration),
			date: date,
		});
    
    res.json(newExercise)

  } catch (err) {
    console.log(err)
    res.send({"message": err.message})
  }

	//? Find the user
	/* User.findById(userId, function (err, userInDb) {
		if (err) {
			console.error(err);
			res.json({ message: 'There are no users with that ID in the database!' });
		}

		//* Create new exercise
		let newExercise = new Exercise({
			userId: userInDb._id,
			username: userInDb.username,
			description: description,
			duration: parseInt(duration),
			date: date,
		});

		newExercise.save((err, exercise) => {
			if (err) {
				console.error(err);
				res.json({ message: 'Exercise creation failed!' });
			}

			res.json({
				username: userInDb.username,
				description: exercise.description,
				duration: exercise.duration,
				date: new Date(exercise.date).toDateString(),
				_id: userInDb._id,
			});
		});
	});*/
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	//? Find the user

	let user = await User.findById(userId);


	//? Find the exercises

	let exercises = await Exercise.find({
		userId: userId,
		date: { $gte: from, $lte: to },
	})
		.select('description duration date')
		.limit(limit)
		.exec();

	let parsedDatesLog = exercises.map((exercise) => {
		return {
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		};
	});

	res.json({
		_id: user._id,
		username: user.username,
		count: parsedDatesLog.length,
		log: parsedDatesLog,
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
