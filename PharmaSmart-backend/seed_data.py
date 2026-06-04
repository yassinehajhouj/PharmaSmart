import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from catalog.models import Categorie, Medicament
from inventory.models import Fournisseur
from authentication.models import User

print("=== Seeding PharmaSmart Database ===\n")

# 1. Créer les catégories
print("1. Création des catégories...")
categories_data = [
    {"nom": "Douleur", "description": "Antalgiques et antipyrétiques", "couleur": "#FF6B6B"},
    {"nom": "Antibiotique", "description": "Antibiotiques à large spectre", "couleur": "#0B6E4F"},
    {"nom": "Anti-inflammatoire", "description": "Anti-inflammatoires non stéroïdiens", "couleur": "#E74C3C"},
    {"nom": "Gastro", "description": "Médicaments gastro-intestinaux", "couleur": "#3498DB"},
    {"nom": "Vitamines", "description": "Compléments alimentaires et vitamines", "couleur": "#F39C12"},
    {"nom": "Allergie", "description": "Antihistaminiques et antiallergiques", "couleur": "#9B59B6"},
    {"nom": "Diabète", "description": "Antidiabétiques", "couleur": "#1B4965"},
    {"nom": "Respiratoire", "description": "Médicaments respiratoires", "couleur": "#00B894"},
]

for cat_data in categories_data:
    cat, created = Categorie.objects.get_or_create(
        nom=cat_data["nom"],
        defaults={
            "description": cat_data["description"],
            "couleur": cat_data["couleur"]
        }
    )
    status = "Créée" if created else "Existe déjà"
    print(f"   {cat.nom}: {status}")

print(f"\n   Total catégories: {Categorie.objects.count()}\n")

# 2. Créer les médicaments
print("2. Création des médicaments...")
medicaments_data = [
    {"nom": "Doliprane 500mg", "categorie": "Douleur", "prix": 25.50, "principe_actif": "Paracétamol", "dosage": "500mg", "forme": "Comprimé", "ordonnance": False, "description": "Antalgique et antipyrétique pour douleurs légères à modérées.", "posologie": "1 à 2 comprimés toutes les 4-6h. Max 4g/jour."},
    {"nom": "Amoxicilline 1g", "categorie": "Antibiotique", "prix": 45.00, "principe_actif": "Amoxicilline", "dosage": "1g", "forme": "Gélule", "ordonnance": True, "description": "Antibiotique à large spectre.", "posologie": "1g toutes les 8 heures."},
    {"nom": "Ibuprofène 400mg", "categorie": "Anti-inflammatoire", "prix": 18.75, "principe_actif": "Ibuprofène", "dosage": "400mg", "forme": "Comprimé", "ordonnance": False, "description": "Anti-inflammatoire non stéroïdien.", "posologie": "1 comprimé 3 fois par jour."},
    {"nom": "Oméprazole 20mg", "categorie": "Gastro", "prix": 32.00, "principe_actif": "Oméprazole", "dosage": "20mg", "forme": "Gélule", "ordonnance": False, "description": "Protecteur gastrique.", "posologie": "1 gélule le matin à jeun."},
    {"nom": "Vitamine C 1000mg", "categorie": "Vitamines", "prix": 55.00, "principe_actif": "Acide ascorbique", "dosage": "1000mg", "forme": "Comprimé effervescent", "ordonnance": False, "description": "Renforce le système immunitaire.", "posologie": "1 comprimé par jour."},
    {"nom": "Loratadine 10mg", "categorie": "Allergie", "prix": 28.00, "principe_actif": "Loratadine", "dosage": "10mg", "forme": "Comprimé", "ordonnance": False, "description": "Antihistaminique pour allergies.", "posologie": "1 comprimé par jour."},
    {"nom": "Metformine 850mg", "categorie": "Diabète", "prix": 38.00, "principe_actif": "Metformine", "dosage": "850mg", "forme": "Comprimé", "ordonnance": True, "description": "Antidiabétique oral.", "posologie": "1 comprimé 2-3 fois par jour."},
    {"nom": "Paracétamol Sirop", "categorie": "Douleur", "prix": 22.00, "principe_actif": "Paracétamol", "dosage": "120mg/5ml", "forme": "Sirop", "ordonnance": False, "description": "Antalgique pour enfants.", "posologie": "Selon le poids de l'enfant."},
    {"nom": "Augmentin 1g", "categorie": "Antibiotique", "prix": 65.00, "principe_actif": "Amoxicilline + Acide clavulanique", "dosage": "1g", "forme": "Comprimé", "ordonnance": True, "description": "Antibiotique associé.", "posologie": "1 comprimé 2 fois par jour."},
    {"nom": "Ventoline Spray", "categorie": "Respiratoire", "prix": 48.00, "principe_actif": "Salbutamol", "dosage": "100µg/dose", "forme": "Aérosol", "ordonnance": True, "description": "Bronchodilatateur pour asthme.", "posologie": "1 à 2 bouffées en cas de crise."},
    {"nom": "Vitamine D 1000UI", "categorie": "Vitamines", "prix": 42.00, "principe_actif": "Cholécalciférol", "dosage": "1000UI", "forme": "Gouttes", "ordonnance": False, "description": "Santé osseuse.", "posologie": "5 gouttes par jour."},
    {"nom": "Smecta 3g", "categorie": "Gastro", "prix": 35.00, "principe_actif": "Diosmectite", "dosage": "3g", "forme": "Sachet", "ordonnance": False, "description": "Traitement de la diarrhée.", "posologie": "1 sachet 3 fois par jour."},
]

for med_data in medicaments_data:
    try:
        categorie = Categorie.objects.get(nom=med_data["categorie"])
        med, created = Medicament.objects.get_or_create(
            nom=med_data["nom"],
            defaults={
                "categorie": categorie,
                "prix": med_data["prix"],
                "principe_actif": med_data["principe_actif"],
                "dosage": med_data["dosage"],
                "forme": med_data["forme"],
                "ordonnance_requise": med_data["ordonnance"],
                "description": med_data["description"],
                "posologie": med_data["posologie"],
            }
        )
        status = "Créé" if created else "Existe déjà"
        print(f"   {med.nom}: {status}")
    except Exception as e:
        print(f"   Erreur {med_data['nom']}: {e}")

print(f"\n   Total médicaments: {Medicament.objects.count()}\n")

# 3. Créer les fournisseurs
print("3. Création des fournisseurs...")
fournisseurs_data = [
    {"nom": "Sanofi Maroc", "contact": "Mohamed Alami", "email": "contact@sanofi.ma", "telephone": "+212 522 123 456", "adresse": "Casablanca", "ville": "Casablanca"},
    {"nom": "GlaxoSmithKline", "contact": "Sara Bennani", "email": "contact@gsk.ma", "telephone": "+212 522 654 321", "adresse": "Rabat", "ville": "Rabat"},
    {"nom": "Pfizer Maroc", "contact": "Ahmed Tazi", "email": "contact@pfizer.ma", "telephone": "+212 522 111 222", "adresse": "Casablanca", "ville": "Casablanca"},
    {"nom": "Pharma 5", "contact": "Youssef Karimi", "email": "contact@pharma5.ma", "telephone": "+212 522 555 666", "adresse": "Casablanca", "ville": "Casablanca"},
]

for four_data in fournisseurs_data:
    four, created = Fournisseur.objects.get_or_create(
        nom=four_data["nom"],
        defaults={
            "contact": four_data["contact"],
            "email": four_data["email"],
            "telephone": four_data["telephone"],
            "adresse": four_data["adresse"],
            "ville": four_data["ville"],
        }
    )
    status = "Créé" if created else "Existe déjà"
    print(f"   {four.nom}: {status}")

print(f"\n   Total fournisseurs: {Fournisseur.objects.count()}\n")

# 4. Créer un patient de test
print("4. Création d'un patient de test...")
patient, created = User.objects.get_or_create(
    username="patient_demo",
    defaults={
        "email": "patient@demo.com",
        "first_name": "Patient",
        "last_name": "Demo",
        "user_type": "PATIENT",
        "telephone": "+212 600 000 000",
    }
)
if created:
    patient.set_password("Demo1234!")
    patient.save()
    print("   patient_demo: Créé (mot de passe: Demo1234!)")
else:
    print("   patient_demo: Existe déjà")

print("\n=== Seeding terminé avec succès ! ===")