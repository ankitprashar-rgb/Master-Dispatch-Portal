-- BULK UPDATE: Standardize Amazon Courier Partner
-- For all entries where Recipient POC is 'Amazon Seller Service',
-- set the Courier Partner to 'Amazon Courier Service'.

UPDATE dispatches 
SET courier_company = 'Amazon Courier Service' 
WHERE (ship_to_poc = 'Amazon Seller Service' OR dispatch_data->>'shipToPoc' = 'Amazon Seller Service');

-- Verification query
SELECT dispatch_id, client_name, ship_to_poc, courier_company 
FROM dispatches 
WHERE ship_to_poc = 'Amazon Seller Service';
