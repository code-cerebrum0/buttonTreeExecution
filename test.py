from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
def create_google_service(path_to_credentials = "credentials.json"):
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

write_to_new_doc("Dockeee", "demm")


print("Executed successfullysdsd")