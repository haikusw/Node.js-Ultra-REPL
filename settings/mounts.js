module.exports = function(size){
	return {
		topright: {
			x: size[0],
			y: 0,
			align: 'right'
		},
		topcenter: {
			x: (size[0] / 2) | 0,
			y: 0,
			align: 'center'
		}
	}
}