
const app = require("express")();

app.use(require("body-parser").urlencoded({ extended: false }));

app.get("/", (req, res) => {
	res.json(["hello http"]);
});


app.post("/.queue/test.worker", (req, res) => {
	console.log("hello worker");
	res.json({data:"hello worker", code: 1});
});


app.listen(4000, () => {
	console.log("Server running on port " + 4000);
});