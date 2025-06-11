# DIGIPINner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/rkaramc/digipinner?style=social)](https://github.com/rkaramc/digipinner/stargazers) [![GitHub forks](https://img.shields.io/github/forks/rkaramc/digipinner?style=social)](https://github.com/rkaramc/digipinner/network/members) [![GitHub contributors](https://img.shields.io/github/contributors/rkaramc/digipinner)](https://github.com/rkaramc/digipinner/graphs/contributors)
[![GitHub issues](https://img.shields.io/github/issues/rkaramc/digipinner)](https://github.com/rkaramc/digipinner/issues) [![GitHub pull requests](https://img.shields.io/github/issues-pr/rkaramc/digipinner)](https://github.com/rkaramc/digipinner/pulls) [![GitHub last commit](https://img.shields.io/github/last-commit/rkaramc/digipinner)](https://github.com/rkaramc/digipinner/commits/main) [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/rkaramc/digipinner/ci.yml?branch=main)](https://github.com/rkaramc/digipinner/actions)

An interactive web application for working with DIGIPINs (Digital PINs) in India. Generate DIGIPINs from map locations and locate positions using DIGIPINs with an intuitive map interface.

## ✨ Features

- 🗺️ Interactive map of India with zoom and pan capabilities
- 📍 Drop pins to generate DIGIPINs for any location
- 🔍 Look up locations by entering a DIGIPIN
- 🏷️ Visualize PIN code boundaries on the map
- 📱 Responsive design for desktop and tablet devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rkaramc/digipinner.git
   cd digipinner
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

For detailed documentation, please see:
- [Product Requirements Document (PRD)](docs/PRD.md)
- [API Documentation](#) (Coming Soon)
- [Deployment Guide](#) (Coming Soon)

### Data Sources

- **PIN Code Boundaries**: 
  - Source: [Data.gov.in](https://data.gov.in/catalog/all-india-pincode-boundary-geo-json)
  - Download Date: June 10, 2025, 10:00 AM IST
  - Format: GeoJSON
  - License: Open Government Data (OGD) Platform India
- **DIGIPIN Specification**: 
  - Source: [India Post](https://www.indiapost.gov.in/VAS/Pages/digipin.aspx)
  - Version: As of June 10, 2025

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [India Post](https://www.indiapost.gov.in/) for the DIGIPIN specification
- [Data.gov.in](https://data.gov.in/) for the PIN Code boundary data
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) for the interactive mapping technology
- [React](https://reactjs.org/) for the UI components

## 📞 Contact

For any questions or feedback, please open an issue or contact the maintainers.
