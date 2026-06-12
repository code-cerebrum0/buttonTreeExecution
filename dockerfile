FROM python:3.13
WORKDIR /

COPY test.py .
CMD ["python", "test.py"]