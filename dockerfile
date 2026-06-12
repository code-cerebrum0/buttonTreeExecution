FROM python:3.13
WORKDIR /

COPY req.txt ./
RUN pip install --no-cache-dir -r req.txt
COPY test.py .

CMD ["python", "test.py"]