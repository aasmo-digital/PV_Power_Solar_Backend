const CustomOption = require('../models/customOption.model');

exports.getOptions = async (req, res) => {
    try {
        const { fieldName } = req.params;
        const options = await CustomOption.find({ fieldName }).select('value');
        res.status(200).json({ data: options.map(opt => opt.value) });
    } catch (error) {
        console.error(`Error fetching options for ${req.params.fieldName}:`, error);
        res.status(500).json({ message: "Server error occurred." });
    }
};

exports.addOption = async (req, res) => {
    try {
        const { fieldName, value } = req.body;
        if (!fieldName || !value) {
            return res.status(400).json({ message: "Field name and value are required." });
        }

        const existingOption = await CustomOption.findOne({ fieldName, value: new RegExp(`^${value}$`, 'i') });
        if (existingOption) {
            return res.status(200).json({ message: "Option already exists.", data: existingOption });
        }

        const newOption = new CustomOption({ fieldName, value });
        await newOption.save();

        res.status(201).json({ message: "Option added successfully.", data: newOption });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ message: "Option already exists." });
        }
        console.error("Error adding custom option:", error);
        res.status(500).json({ message: "Server error occurred." });
    }
};