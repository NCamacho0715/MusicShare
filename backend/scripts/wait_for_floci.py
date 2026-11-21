import sys
import time
import urllib.request
import urllib.error

ENDPOINT = "http://localhost:4566"

def check_floci(retries=30, delay=2):
    print(f"Esperando a que Floci esté disponible en {ENDPOINT}...")
    for i in range(1, retries + 1):
        try:
            # Try connecting to Floci
            req = urllib.request.Request(f"{ENDPOINT}/_localstack/health")
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    print(f"Floci listo y saludable (intento {i}/{retries}).")
                    return True
        except Exception:
            # Floci might also respond to root or standard AWS error
            try:
                req = urllib.request.Request(ENDPOINT)
                with urllib.request.urlopen(req, timeout=3) as resp:
                    print(f"Floci respondiendo en {ENDPOINT} (intento {i}/{retries}).")
                    return True
            except urllib.error.HTTPError as e:
                # Any HTTP response code (400, 403, 404, 405) means service is listening!
                print(f"Floci respondiendo (código HTTP {e.code}) (intento {i}/{retries}).")
                return True
            except Exception:
                pass

        print(f"Esperando a Floci... intento {i}/{retries}")
        time.sleep(delay)

    print("ERROR: Tiempo de espera agotado para Floci.")
    return False

if __name__ == "__main__":
    if not check_floci():
        sys.exit(1)
