# The Proof Is Trivial

## Setup

To set up and run this application sucessfully, do the following:

1. Download all the files off the github repository (If you aready have all the files by other means you can skip this step)
2. Install the latest version of python
3. create a python virtual environment using this command in your terminal:```python3 -m venv .venv```
4. Activate the virtual environment using: ```source .venv/bin/activate```
5. install all the required packages by using: ```pip install -r requirements.txt```
6. sign in to and get an API key from [here](https://aistudio.google.com/welcome?utm_source=PMAX&utm_medium=display&utm_campaign=Cloud-SS-DR-AIS-FY26-global-pmax-1713578&utm_content=pmax&gad_source=1&gad_campaignid=23417432327&gclid=EAIaIQobChMIvY7S7uTakwMVTMzCBB2_nTIZEAAYASAAEgIKqPD_B)
7. replace INSERT_API_KEY_HERE in setEnvironment.sh to the API key in the previous step
8. run the script by using ```./setEnvironment.sh``` in your terminal
9. in your terminal run the following command: ```uvicorn api:app --reload```
10. Host a website using all of the .js and .html files on your web hosting platform of choice. If you are on campus this link should direct you to the website: [Link](http://dolphin.csci.viu.ca/~declarkt/index.html#!)

## USAGE

To use our website, just login to the webpage (or create an account) Then begin generating proof by typing the proposition in the giant box, then pressing Trivialize Proof. To see your generated proofs you can go to the "Manage your Proofs" tabs top see all of your generated proofs (The ones that you generated for the first time) and it allows you to delete them from there if you dont want to see it anymore. Under the accounts tab, you can log out, delete your account and discover the meaning of life.
