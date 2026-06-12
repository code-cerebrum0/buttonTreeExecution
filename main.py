######

    # HAS risky CODE exec() 
# uncomment the  exec() before running
# do not pass risky code in the code of buttons It may affect the local machine

######

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure basic settings globally
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='app.log', 
    filemode='a'        
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5500'],
    allow_methods = ["*"],
    allow_credentials = True,
    allow_headers = [ "*"],
)

class ButtonRequest(BaseModel):
    name : str
    function : str


logger = logging.getLogger("Logger")



buttons_map = {}

class Button:
    def __init__(self, name, function = lambda : "Not Defined"):
        self.name = name
        self.function = function
        self.connectedButtonNames = []
        buttons_map[self.name] = self
        logger.info("Button %s was created and added to buttons list", self.name)
        self.isTrigger= False

    def determineNextBtn(self): # if want to add logic to selecting newxt button it can be added here
        # dummy returning 0th element
        if not self.connectedButtonNames:
            logger.info("This is the last execution.")
            return
        
        # self.list_underlying_buttons()
        # x = input("select the next button: ")
        # return x
        logger.info("Next button to be executed is %s", self.connectedButtonNames[0]) 

        return self.connectedButtonNames[0]


    def __call__(self):
        logger.info("executing %s button", self.name)
        logger.info("trying to execute the function  %s", self.function)
        # exec(self.function) # very dangerous 
        logger.info("Button %s wass called." , self.name)

        

    
    def list_underlying_buttons(self):
        print(f"The buttons in {self.name} button are: ")
        for i in self.connectedButtonNames:
            print(i)

    def _connect (self,btnName : str):
        if btnName not in list(buttons_map.keys()):
            logger.warning("There is no button %s", btnName)
            return
        if btnName not in self.connectedButtonNames:
            self.connectedButtonNames.append(btnName)
            logger.info("The connection %s -> %s is built.", self.name, btnName)
            return 1
        else: 
            print("Connection already in built.")
            logger.info("Connection unable to be built... %s -> %s", self.name, btnName)
            return 0
    def _disconnect(self, btnName: str):
        if btnName in self.connectedButtonNames:
            self.connectedButtonNames.remove(btnName)
            logger.warning("connection removed : %s -> %s", self.name, btnName)
        else:
            logger.info("There is no such connection to delete.")

    def trigger(self):
        self.__call__()

        nxtBtnName = self.determineNextBtn()
        if not nxtBtnName:
            print("End of the flow")
            return
        nxtBtn = getBtn(nxtBtnName)
        nxtBtn.trigger()


class TriggerButton(Button):
    def __init__(self, name, function=lambda : "Not Defined"):
        super().__init__(name, function)

# def startCreatingTree(node):
#     # the button through which this function will be called will automatically become the trigger node.
#     # and to trigger the tree just use .trigger() method

# buttons.append(tn)



def startCreatingConnections():
    while True:
        print(buttons_map.keys())
        
        x = input("Select the 1st btn: ")
        if x in ['exit']:
            break
        y = input("Select the 2nd btn: ")

        buttons_map[x]._connect(y)

def executeBtn(btn : str):
    return buttons_map[btn]()

def getBtn(btn: str):
    return buttons_map[btn]


from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
def create_google_service(path_to_credentials = "credentials.json"):
    logger.info("Creating google service.")
    SCOPES = ["https://www.googleapis.com/auth/documents"]

    flow = InstalledAppFlow.from_client_secrets_file(
        "credentials.json",
        SCOPES
    )

    creds = flow.run_local_server(port=0)
    return build("docs", "v1", credentials=creds)

def create_new_doc(service, title):
    document = service.documents().create(
        body={"title": title}
    ).execute()

    document_id = document["documentId"]

    print("Document ID:", document_id)
    return document_id
def write_to_existing_doc(document_id, text):
    service = create_google_service()

    requests = [
        {
            "insertText": {
                "location": {
                    "index": 1
                },
                "text": text
            }
        }
    ]

    result = service.documents().batchUpdate(
        documentId=document_id,
        body={"requests": requests}
    ).execute()

    return result

def write_to_new_doc(text, title):
    service = create_google_service()
    document_id = create_new_doc(service, title= title)

    requests = [
            {
            'insertText': {
                'location': {'index': 1,},
                'text': text
            }
            }
    ]

    result = service.documents().batchUpdate(
        documentId=document_id, body={'requests': requests}).execute()
    return result


def run_code(): # containerized execution
    ...


@app.post("/buttons")
async def create_button(req: Request):

    data = await req.json()
    name = data["name"]
    function = data["function"]
    print(name)
    Button(name,    function)
    return {"status": "ok"}

@app.delete("/buttons/{name}")
def delete_button(name):
    buttons_map.pop(name)
    return {"status": "ok"}


@app.post("/edges")
async def create_connection(req : Request):
    data = await req.json()
    f = data['from']
    to =data['to']
    buttons_map[f]._connect(to)
    return {"status": "ok"}

@app.delete("/edges")
async def delete_connection(req : Request):
    data = await req.json()
    f = data['from']
    to = data['to']
    buttons_map[f]._disconnect(to)
    return {"status": "ok"}


@app.post("/trigger")
async def set_trigger_node(req  : Request):
    data  = await req.json()
    name = data['name']

    buttons_map[name].isTrigger = True
    return {"status": "ok"}


@app.post("/execute")
async def execute(req : Request):
    data  = await req.json()
    print("The data is: ", data)

    name = data['trigger']
    buttons_map[name].trigger()
    return {"status": "ok"}

@app.get("/state")
def getState():
    ...

@app.get("/health", status_code=200)
async def health():
    return {"status": "ok"}

